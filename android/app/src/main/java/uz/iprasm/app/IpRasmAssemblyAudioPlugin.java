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
    @Override public void load(){main.post(()->AssemblyAudioService.claim(lease,state->{if(active&&!destroyed&&AssemblyAudioService.owns(lease))notifyListeners("change",state);}));}
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
    @PluginMethod public void status(PluginCall call){main.post(()->call.resolve(AssemblyAudioService.snapshot()));}
    @Override protected void handleOnPause(){active=false;}
    @Override protected void handleOnResume(){active=true;main.post(()->{if(!destroyed&&AssemblyAudioService.owns(lease))notifyListeners("change",AssemblyAudioService.snapshot());});}
    @Override protected void handleOnDestroy(){destroyed=true;main.post(()->AssemblyAudioService.stop(lease));}
}
