package uz.iprasm.app;

import android.Manifest;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.*;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Locale;

/** Push-to-talk only. On-device service + installed model required; never a cloud fallback/download. */
@CapacitorPlugin(name="IpRasmCommands",permissions={@Permission(alias="microphone",strings={Manifest.permission.RECORD_AUDIO})})
public final class IpRasmCommandsPlugin extends Plugin {
    private final Handler main=new Handler(Looper.getMainLooper());
    private final AudioRequestFence fence=new AudioRequestFence();
    private SpeechRecognizer recognizer;
    private PluginCall pending,permissionCall;
    private Runnable deadline;
    private boolean active=true,destroyed=false;
    private int generation=0,permissionGeneration=0;
    private boolean available(){
        if(Build.VERSION.SDK_INT<33)return false;
        try{return SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext());}catch(Exception e){return false;}
    }
    private boolean accept(PluginCall call){
        String before=fence.controller();
        if(destroyed||!fence.accept(call.getString("controller",""),call.getInt("requestId",0)))return false;
        if(!before.equals(fence.controller()))close("cancelled",null);
        return true;
    }
    private boolean current(PluginCall call,int token){
        return !destroyed&&active&&pending==call&&generation==token&&fence.current(call.getString("controller",""),call.getInt("requestId",0));
    }
    private JSObject result(PluginCall call,String status,JSArray alternatives){
        JSObject value=new JSObject();value.put("session",call.getString("session",""));value.put("status",status);value.put("alternatives",alternatives==null?new JSArray():alternatives);return value;
    }
    private void close(String status,JSArray alternatives){
        generation++;if(deadline!=null){main.removeCallbacks(deadline);deadline=null;}
        PluginCall call=pending;pending=null;
        SpeechRecognizer old=recognizer;recognizer=null;
        if(old!=null){try{old.cancel();}catch(Exception e){}try{old.destroy();}catch(Exception e){}}
        if(call!=null)call.resolve(result(call,status,alternatives));
    }
    private void permissionResult(PluginCall call,boolean granted){JSObject value=new JSObject();value.put("granted",granted);call.resolve(value);}
    @PluginMethod public void capabilities(PluginCall call){main.post(()->{JSObject value=new JSObject();value.put("supported",active&&!destroyed&&available());value.put("localOnly",true);call.resolve(value);});}
    @PluginMethod public void permission(PluginCall call){main.post(()->{
        if(!accept(call)||!active||!available()){permissionResult(call,false);return;}
        if(getPermissionState("microphone")==PermissionState.GRANTED){permissionResult(call,true);return;}
        if(permissionCall!=null){permissionResult(call,false);return;}
        permissionCall=call;permissionGeneration=generation;
        requestPermissionForAlias("microphone",call,"microphonePermission");
    });}
    @PermissionCallback private void microphonePermission(PluginCall call){main.post(()->{
        if(permissionCall!=call)return;
        permissionCall=null;
        permissionResult(call,!destroyed&&active&&permissionGeneration==generation&&fence.current(call.getString("controller",""),call.getInt("requestId",0))&&getPermissionState("microphone")==PermissionState.GRANTED);
    });}
    @PluginMethod public void cancel(PluginCall call){main.post(()->{if(accept(call))close("cancelled",null);call.resolve();});}
    @PluginMethod public void listen(PluginCall call){main.post(()->{
        String language=call.getString("language",""),session=call.getString("session","");
        if(!accept(call)||!active||!available()||!Arrays.asList("uz","ru","en").contains(language)||!session.matches("[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}")){
            call.resolve(result(call,"unavailable",null));return;
        }
        if(getPermissionState("microphone")!=PermissionState.GRANTED){call.resolve(result(call,"denied",null));return;}
        close("cancelled",null);pending=call;final int token=generation;
        try{
            recognizer=SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext());
            recognizer.setRecognitionListener(new RecognitionListener(){
                @Override public void onReadyForSpeech(Bundle values){if(current(call,token)){JSObject value=new JSObject();value.put("session",session);notifyListeners("ready",value);}}
                @Override public void onBeginningOfSpeech(){}
                @Override public void onRmsChanged(float value){}
                @Override public void onBufferReceived(byte[] buffer){} // No audio storage, forwarding or logging.
                @Override public void onEndOfSpeech(){}
                @Override public void onPartialResults(Bundle values){} // Never execute partial words.
                @Override public void onEvent(int type,Bundle values){}
                @Override public void onError(int error){if(current(call,token))close("no-match",null);}
                @Override public void onResults(Bundle values){
                    if(!current(call,token))return;
                    try{
                        ArrayList<String> text=values.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        float[] confidence=values.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES);
                        if(text==null||text.isEmpty()||text.size()>3){close("no-match",null);return;}
                        JSArray alternatives=new JSArray();
                        for(int k=0;k<text.size();k++){
                            String phrase=text.get(k);
                            if(phrase==null||phrase.trim().isEmpty()||phrase.length()>80){close("no-match",null);return;}
                            float score=confidence!=null&&k<confidence.length?confidence[k]:-1;
                            if(!Float.isFinite(score))score=-1;
                            JSObject candidate=new JSObject();candidate.put("text",phrase);candidate.put("confidence",score);alternatives.put(candidate);
                        }
                        close("result",alternatives);
                    }catch(Exception e){close("no-match",null);}
                }
            });
            Intent intent=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE,language)
                .putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE,true)
                .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS,false)
                .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS,3);
            InstalledModels.start(this,call,token,intent,language);
            if(current(call,token)){deadline=()->{if(current(call,token))close("no-match",null);};main.postDelayed(deadline,8000);}
        }catch(Exception e){close("unavailable",null);}
    });}
    /** API33 inventory is mandatory: "supported/pending download" does not mean installed. */
    @androidx.annotation.RequiresApi(33)
    private static final class InstalledModels {
        static void start(IpRasmCommandsPlugin owner,PluginCall call,int token,Intent intent,String language){
            owner.recognizer.checkRecognitionSupport(intent,owner.getContext().getMainExecutor(),new RecognitionSupportCallback(){
                @Override public void onSupportResult(RecognitionSupport support){
                    if(!owner.current(call,token))return;
                    try {
                    String installed=null;
                    for(String tag:support.getInstalledOnDeviceLanguages())if(Locale.forLanguageTag(tag).getLanguage().equals(language)){installed=tag;break;}
                    if(installed==null){owner.close("unavailable",null);return;}
                    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE,installed);owner.recognizer.startListening(intent);
                    }catch(Exception e){owner.close("unavailable",null);}
                }
                @Override public void onError(int error){if(owner.current(call,token))owner.close("unavailable",null);}
            });
        }
    }
    @Override protected void handleOnPause(){active=false;main.post(()->close("cancelled",null));}
    @Override protected void handleOnResume(){active=true;}
    @Override protected void handleOnDestroy(){destroyed=true;active=false;main.post(()->{close("cancelled",null);if(permissionCall!=null){PluginCall call=permissionCall;permissionCall=null;permissionResult(call,false);}});}
}
