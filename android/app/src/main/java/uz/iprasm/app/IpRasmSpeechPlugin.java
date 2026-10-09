package uz.iprasm.app;

import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Handler;
import android.os.Looper;
import android.os.Build;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.LinkedHashSet;

/** Device-installed offline voices only. No cloud synthesis, text upload or language substitution. */
@CapacitorPlugin(name="IpRasmSpeech")
public class IpRasmSpeechPlugin extends Plugin {
    private final Handler main=new Handler(Looper.getMainLooper());
    private TextToSpeech tts;
    private boolean ready=false,failed=false,destroyed=false,active=true;
    private int latest=0,cancelledThrough=0,starts=0,errors=0;
    private String session="";
    private final LinkedHashSet<String> retiredSessions=new LinkedHashSet<>();
    private AudioManager audio;
    private AudioFocusRequest focus;
    private final AudioManager.OnAudioFocusChangeListener focusListener=change->main.post(()->{if(change<0){cancelledThrough=latest;stopAudio();}});
    private final AudioAttributes attributes=new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build();
    private static class Task { final PluginCall call; final Runnable run; Task(PluginCall c,Runnable r){call=c;run=r;} }
    private final List<Task> waiting=new ArrayList<>();
    @Override public void load() {
        main.post(()->{
            audio=(AudioManager)getContext().getSystemService(android.content.Context.AUDIO_SERVICE);
            if(Build.VERSION.SDK_INT>=26)focus=new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK).setAudioAttributes(attributes).setOnAudioFocusChangeListener(focusListener,main).build();
            tts=new TextToSpeech(getContext(),status->main.post(()->{
                if(destroyed)return;
                ready=status==TextToSpeech.SUCCESS;failed=!ready;
                if(ready){
                    tts.setAudioAttributes(attributes);
                    tts.setOnUtteranceProgressListener(new UtteranceProgressListener(){
                        @Override public void onStart(String id){main.post(()->starts++);}
                        @Override public void onDone(String id){finish(id,false);}
                        @Override public void onError(String id){finish(id,true);}
                        @Override public void onError(String id,int code){finish(id,true);}
                        @Override public void onStop(String id,boolean interrupted){finish(id,false);}
                    });
                }
                List<Task> tasks=new ArrayList<>(waiting);waiting.clear();for(Task task:tasks)dispatch(task);
            }));
        });
    }
    private void releaseFocus(){if(audio!=null){if(Build.VERSION.SDK_INT>=26&&focus!=null)audio.abandonAudioFocusRequest(focus);else audio.abandonAudioFocus(focusListener);}}
    private void finish(String id,boolean error){main.post(()->{if(error)errors++;if(id.equals(session+":"+latest))releaseFocus();});}
    private void stopAudio(){if(tts!=null)tts.stop();releaseFocus();}
    private boolean bindSession(PluginCall call){
        String next=call.getString("session","");if(next.length()!=36||retiredSessions.contains(next))return false;
        if(!next.equals(session)){if(!session.isEmpty())retiredSessions.add(session);if(retiredSessions.size()>128)retiredSessions.remove(retiredSessions.iterator().next());stopAudio();session=next;latest=0;cancelledThrough=0;}
        return true;
    }
    private void dispatch(Task task){if(destroyed||failed||!ready){task.call.reject("Offline speech engine unavailable");return;}try{task.run.run();}catch(Exception e){task.call.reject("Offline speech request failed",e);}}
    private void withEngine(PluginCall call,Runnable run){
        Task task=new Task(call,run);
        if(ready||failed||destroyed){dispatch(task);return;}
        waiting.add(task);main.postDelayed(()->{if(waiting.remove(task))call.reject("Offline speech initialization timed out");},15000);
    }
    private List<Voice> offlineVoices(){
        List<Voice> voices=new ArrayList<>();Set<Voice> available=tts.getVoices();
        if(available!=null)for(Voice v:available)if(!v.isNetworkConnectionRequired()&&(v.getFeatures()==null||!v.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)))voices.add(v);
        voices.sort(Comparator.comparing(Voice::getName));return voices;
    }
    @PluginMethod public void voices(PluginCall call){main.post(()->withEngine(call,()->{
        JSArray list=new JSArray();for(Voice v:offlineVoices()){JSObject value=new JSObject();value.put("id",v.getName());value.put("name",v.getName());value.put("lang",v.getLocale().toLanguageTag());list.put(value);}
        JSObject result=new JSObject();result.put("voices",list);call.resolve(result);
    }));}
    @PluginMethod public void speak(PluginCall call){main.post(()->{
        if(!bindSession(call)){JSObject stale=new JSObject();stale.put("queued",false);call.resolve(stale);return;}String requestSession=session;
        int id=call.getInt("requestId",0);if(id<=latest){JSObject stale=new JSObject();stale.put("queued",false);call.resolve(stale);return;}latest=id;stopAudio();
        withEngine(call,()->{
            if(!requestSession.equals(session)||id!=latest||id<=cancelledThrough||!active){JSObject stale=new JSObject();stale.put("queued",false);call.resolve(stale);return;}
            String text=call.getString("text",""),name=call.getString("voiceId",""),language=call.getString("language","");double rate=call.getDouble("rate",1.0);
            if(text.trim().isEmpty()||text.length()>600||!Double.isFinite(rate)||rate<.5||rate>1.5){call.reject("Invalid speech request");return;}
            Voice selected=null;for(Voice v:offlineVoices())if(v.getName().equals(name)&&v.getLocale().getLanguage().equalsIgnoreCase(language)){selected=v;break;}
            if(selected==null||tts.setVoice(selected)!=TextToSpeech.SUCCESS){call.reject("No installed offline voice for the selected language");return;}
            int granted=Build.VERSION.SDK_INT>=26?audio.requestAudioFocus(focus):audio.requestAudioFocus(focusListener,AudioManager.STREAM_MUSIC,AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK);
            if(granted!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED){call.reject("Audio focus unavailable");return;}
            tts.setSpeechRate((float)rate);
            if(tts.speak(text,TextToSpeech.QUEUE_FLUSH,null,session+":"+id)==TextToSpeech.ERROR){stopAudio();call.reject("Speech could not start");return;}
            JSObject result=new JSObject();result.put("queued",true);call.resolve(result);
        });
    });}
    @PluginMethod public void stop(PluginCall call){main.post(()->{if(bindSession(call)){int id=call.getInt("requestId",0);if(id>=latest){latest=id;cancelledThrough=id;stopAudio();}}call.resolve();});}
    @PluginMethod public void status(PluginCall call){main.post(()->{JSObject value=new JSObject();value.put("ready",ready);value.put("speaking",ready&&tts!=null&&tts.isSpeaking());value.put("latestRequestId",latest);value.put("session",session);value.put("starts",starts);value.put("errors",errors);value.put("offlineOnly",true);call.resolve(value);});}
    @Override protected void handleOnPause(){main.post(()->{active=false;cancelledThrough=latest;stopAudio();});}
    @Override protected void handleOnResume(){main.post(()->active=true);}
    @Override protected void handleOnDestroy(){main.post(()->{destroyed=true;ready=false;stopAudio();for(Task task:waiting)task.call.reject("Speech activity closed");waiting.clear();if(tts!=null){tts.shutdown();tts=null;}});}
}
