package uz.iprasm.app;

import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.UUID;

@CapacitorPlugin(name="IpRasmAssemblyAudio")
public final class IpRasmAssemblyAudioPlugin extends Plugin {
    private final Handler main=new Handler(Looper.getMainLooper());
    private final String lease=UUID.randomUUID().toString();
    private final AudioRequestFence fence=new AudioRequestFence();
    private boolean active=true,destroyed=false;
    @Override public void load(){main.post(()->{if(!destroyed)AssemblyAudioService.claim(lease,state->{if(active&&!destroyed&&AssemblyAudioService.owns(lease))notifyListeners("change",state);});});}
    private boolean accept(PluginCall call){
        String next=call.getString("controller","");Integer request=call.getInt("requestId",0);
        String before=fence.controller();
        if(destroyed||!AssemblyAudioService.owns(lease)||request==null||!fence.accept(next,request))return false;
        if(!before.equals(next))AssemblyAudioService.stop(lease);
        return true;
    }
    @PluginMethod public void capabilities(PluginCall call){JSObject result=new JSObject();result.put("supported",true);result.put("offlineOnly",true);result.put("mediaControls",true);call.resolve(result);}
    @PluginMethod public void start(PluginCall call){main.post(()->{
        if(!accept(call)||!active){call.reject("Audio session is no longer active");return;}
        final int request=fence.latest();final String source=fence.controller();
        final AssemblyAudioProgram program;
        try{program=new AssemblyAudioProgram(call.getObject("program"));}
        catch(Exception e){call.reject("Invalid offline audio program");return;}
        AssemblyAudioService.prepare(getContext(),lease,program,new AssemblyAudioService.Reply(){
            @Override public void success(JSObject state){if(!destroyed&&fence.current(source,request)&&AssemblyAudioService.owns(lease))call.resolve(state);else call.reject("Audio session replaced");}
            @Override public void failure(){call.reject("Offline audio unavailable");}
        });
    });}
    @PluginMethod public void command(PluginCall call){main.post(()->{
        String command=call.getString("command","");
        if(!accept(call)||!java.util.Arrays.asList("play","pause","next","previous").contains(command)||("play".equals(command)&&!active)){call.reject("Inactive audio command");return;}
        call.resolve(AssemblyAudioService.command(lease,call.getString("session",""),call.getString("sequenceHash",""),command));
    });}
    @PluginMethod public void stop(PluginCall call){main.post(()->{if(accept(call))AssemblyAudioService.stop(lease);call.resolve();});}
    @PluginMethod public void status(PluginCall call){main.post(()->{if(destroyed||!AssemblyAudioService.owns(lease)){call.reject("Audio authority retired");return;}call.resolve(AssemblyAudioService.snapshot());});}
    @PluginMethod public void checkpoint(PluginCall call){main.post(()->{
        if(destroyed||!AssemblyAudioService.owns(lease)){call.reject("Audio authority retired");return;}
        android.content.SharedPreferences saved=getContext().getSharedPreferences("iprasm-assembly-audio-v1",android.content.Context.MODE_PRIVATE);
        try {
        long stamp=saved.getLong("updatedAt",0),now=System.currentTimeMillis();
        JSObject result=new JSObject();
        if(stamp<=0||stamp>now+60000||stamp<now-7*24*60*60*1000L){saved.edit().clear().apply();call.resolve(result);return;}
        String project=call.getString("projectId",""),hash=call.getString("sequenceHash","");
        if(project.equals(saved.getString("projectId",""))&&hash.equals(saved.getString("sequenceHash",""))){
            result.put("projectId",project);result.put("sequenceHash",hash);result.put("updatedAt",stamp);result.put("current",saved.getInt("current",0));
        }
        call.resolve(result);
        }catch(Exception e){saved.edit().clear().apply();call.resolve(new JSObject());}
    });}
    @PluginMethod public void clearCheckpoint(PluginCall call){main.post(()->{
        if(destroyed||!AssemblyAudioService.owns(lease)){call.reject("Audio authority retired");return;}
        AssemblyAudioService.stop(lease);
        getContext().getSharedPreferences("iprasm-assembly-audio-v1",android.content.Context.MODE_PRIVATE).edit().clear().apply();
        call.resolve();
    });}
    @Override protected void handleOnPause(){active=false;}
    @Override protected void handleOnResume(){active=true;main.post(()->{if(!destroyed&&AssemblyAudioService.owns(lease))notifyListeners("change",AssemblyAudioService.snapshot());});}
    @Override protected void handleOnDestroy(){destroyed=true;main.post(()->AssemblyAudioService.release(lease));}
}
