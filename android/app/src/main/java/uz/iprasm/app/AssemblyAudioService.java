package uz.iprasm.app;

import android.app.*;
import android.content.*;
import android.content.res.AssetFileDescriptor;
import android.content.pm.ServiceInfo;
import android.media.*;
import android.media.session.*;
import android.os.*;
import android.speech.tts.*;
import com.getcapacitor.JSObject;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

/** Explicit user-started, non-restarting offline media playback. Never confirms assembly. */
public final class AssemblyAudioService extends Service {
    interface Reply { void success(JSObject value); void failure(); }
    private static final Handler MAIN=new Handler(Looper.getMainLooper());
    private static final int NOTICE=2191;
    private static final String CHANNEL="assembly_audio";
    private static AssemblyAudioService instance;
    private static String authority="";
    private static Consumer<JSObject> observer;
    private static Pending pending;
    private static JSObject last=empty();
    private static final class Pending {
        final String lease; final AssemblyAudioProgram program; final Reply reply;
        Pending(String l,AssemblyAudioProgram p,Reply r){lease=l;program=p;reply=r;}
    }
    static void claim(String lease,Consumer<JSObject> listener){
        stop(authority);authority=lease;observer=listener;last=empty();
    }
    static boolean owns(String lease){return authority.equals(lease);}
    static void release(String lease){if(owns(lease)){stop(lease);observer=null;authority="";}}
    static JSObject snapshot(){return instance!=null&&instance.program!=null?instance.state():last;}
    static void prepare(Context context,String lease,AssemblyAudioProgram program,Reply reply){
        if(!owns(lease)){reply.failure();return;}
        if(pending!=null)pending.reply.failure();
        Pending next=new Pending(lease,program,reply);pending=next;
        try {
            Intent intent=new Intent(context,AssemblyAudioService.class).putExtra("start",program.session);
            if(Build.VERSION.SDK_INT>=26)context.startForegroundService(intent);else context.startService(intent);
        } catch(Exception e){if(pending==next)pending=null;reply.failure();return;}
        MAIN.postDelayed(()->{
            if(pending==next){pending=null;reply.failure();}
            if(instance!=null&&instance.starting==next){instance.fail();}
        },15000);
    }
    static void stop(String lease){
        if(!owns(lease))return;
        if(pending!=null){Pending p=pending;pending=null;p.reply.failure();}
        if(instance!=null)instance.finish();
    }
    static JSObject command(String lease,String session,String hash,String command){
        if(!owns(lease)||instance==null||instance.program==null||!instance.program.session.equals(session)||!instance.program.hash.equals(hash))return snapshot();
        instance.control(command);return instance.state();
    }
    private static JSObject empty(){
        JSObject o=new JSObject();o.put("version","assembly-audio-state/1");o.put("session","");o.put("sequenceHash","");o.put("current",0);o.put("total",0);o.put("revision",0);o.put("active",false);o.put("playing",false);o.put("error","");return o;
    }
    private final Handler main=new Handler(Looper.getMainLooper());
    private final ExecutorService io=Executors.newSingleThreadExecutor();
    private AssemblyAudioProgram program;
    private Pending starting;
    private MediaSession media;
    private TextToSpeech tts;
    private MediaPlayer player;
    private AudioManager audio;
    private AudioFocusRequest focus;
    private PowerManager.WakeLock wake;
    private boolean playing=false,ready=false;
    private volatile boolean closed=false;
    private volatile int epoch=0;
    private int current=1,revision=0;
    private long began=0;
    private String error="";
    private final AudioAttributes attributes=new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build();
    private final AudioManager.OnAudioFocusChangeListener focusChange=change->main.post(()->{if(change<0)pause("");});
    private final BroadcastReceiver noisy=new BroadcastReceiver(){@Override public void onReceive(Context c,Intent i){pause("");}};
    @Override public void onCreate(){
        super.onCreate();instance=this;
        audio=(AudioManager)getSystemService(AUDIO_SERVICE);
        if(Build.VERSION.SDK_INT>=26)focus=new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN).setAudioAttributes(attributes).setWillPauseWhenDucked(true).setOnAudioFocusChangeListener(focusChange,main).build();
        wake=((PowerManager)getSystemService(POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"IpRasm:AssemblyAudio");wake.setReferenceCounted(false);
        if(Build.VERSION.SDK_INT>=26)((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(new NotificationChannel(CHANNEL,"Ip Rasm",NotificationManager.IMPORTANCE_LOW));
        media=new MediaSession(this,"IpRasmAssemblyAudio");
        media.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS|MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
        media.setCallback(new MediaSession.Callback(){
            @Override public void onPlay(){control("play");}
            @Override public void onPause(){control("pause");}
            @Override public void onSkipToNext(){control("next");}
            @Override public void onSkipToPrevious(){control("previous");}
            @Override public void onStop(){finish();}
        },main);
        if(Build.VERSION.SDK_INT>=33)registerReceiver(noisy,new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY),Context.RECEIVER_NOT_EXPORTED);
        else registerReceiver(noisy,new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY));
    }
    @Override public int onStartCommand(Intent intent,int flags,int id){
        String session=intent==null?"":intent.getStringExtra("start");
        if(session!=null&&pending!=null&&session.equals(pending.program.session)&&owns(pending.lease)){
            Pending p=pending;pending=null;load(p);
        } else if(program!=null&&intent!=null&&program.session.equals(intent.getStringExtra("session"))){control(intent.getStringExtra("command"));}
        else if(program==null){finish();}
        return START_NOT_STICKY;
    }
    private void load(Pending p){
        clearEngine();closed=false;program=p.program;starting=p;current=program.current;revision=0;error="";
        media.setActive(true);
        try {
            if(Build.VERSION.SDK_INT>=29)startForeground(NOTICE,notification(),ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            else startForeground(NOTICE,notification());
        } catch(Exception e){fail();return;}
        if(!program.clips.isEmpty()){
            final int token=epoch;final AssemblyAudioProgram source=program;
            io.execute(()->{
                boolean valid=true;
                try {for(AssemblyAudioProgram.Clip clip:source.clips){
                    MessageDigest digest=MessageDigest.getInstance("SHA-256");int size=0;
                    try(InputStream in=getAssets().open("public"+clip.path)){
                        byte[] buffer=new byte[8192];int n;
                        while((n=in.read(buffer))!=-1){size+=n;if(closed||token!=epoch||Thread.currentThread().isInterrupted()||size>clip.bytes)throw new Exception();digest.update(buffer,0,n);}
                    }
                    StringBuilder hash=new StringBuilder();for(byte b:digest.digest())hash.append(String.format(java.util.Locale.ROOT,"%02x",b&255));
                    if(size!=clip.bytes||!hash.toString().equals(clip.sha))throw new Exception();
                }}catch(Exception e){valid=false;}
                final boolean verified=valid;main.post(()->{if(!closed&&token==epoch&&program==source){if(verified){ready=true;play();}else fail();}});
            });
        } else {
            final int token=epoch;
            tts=new TextToSpeech(this,status->main.post(()->{
                if(closed||token!=epoch)return;
                if(status!=TextToSpeech.SUCCESS){fail();return;}
                try {
                Voice selected=null;Set<Voice> voices=tts.getVoices();
                if(voices!=null)for(Voice v:voices)if(v.getName().equals(program.voice)&&v.getLocale().getLanguage().equals(program.language)&&!v.isNetworkConnectionRequired()&&(v.getFeatures()==null||!v.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED))){selected=v;break;}
                if(selected==null||tts.setVoice(selected)!=TextToSpeech.SUCCESS){fail();return;}
                if(tts.setAudioAttributes(attributes)!=TextToSpeech.SUCCESS||tts.setSpeechRate((float)program.rate)!=TextToSpeech.SUCCESS){fail();return;}
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener(){
                    @Override public void onStart(String id){}
                    @Override public void onDone(String id){main.post(()->{if(id.equals(utterance()))done(epoch);});}
                    @Override public void onError(String id){main.post(()->{if(id.equals(utterance()))fail();});}
                    @Override public void onError(String id,int code){onError(id);}
                });
                ready=true;play();
                }catch(Exception e){fail();}
            }));
        }
    }
    private String utterance(){return program==null?"":program.session+":"+epoch;}
    private void play(){
        if(closed||!ready||program==null)return;
        try {
        int granted=Build.VERSION.SDK_INT>=26?audio.requestAudioFocus(focus):audio.requestAudioFocus(focusChange,AudioManager.STREAM_MUSIC,AudioManager.AUDIOFOCUS_GAIN);
        if(granted!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED){fail();return;}
        playing=true;error="";read();
        if(starting!=null){Pending p=starting;starting=null;p.reply.success(state());}
        }catch(Exception e){fail();}
    }
    private void read(){
        stopStep();if(!playing||program==null)return;
        int token=epoch;began=SystemClock.elapsedRealtime();wake.acquire(5*60*1000L);
        publish();AssemblyAudioProgram.Step step=program.steps.get(current-1);
        if(step.clips.length==0){if(tts.speak(step.text,TextToSpeech.QUEUE_FLUSH,null,utterance())==TextToSpeech.ERROR)fail();}
        else clip(token,0);
        main.postDelayed(()->{if(token==epoch&&playing)fail();},120500);
    }
    private void clip(int token,int index){
        if(token!=epoch||!playing||program==null)return;
        AssemblyAudioProgram.Step step=program.steps.get(current-1);
        if(index>=step.clips.length){done(token);return;}
        releasePlayer();AssemblyAudioProgram.Clip clip=program.clips.get(step.clips[index]);
        try(AssetFileDescriptor fd=getAssets().openFd("public"+clip.path)){
            MediaPlayer next=new MediaPlayer();player=next;next.setAudioAttributes(attributes);
            next.setDataSource(fd.getFileDescriptor(),fd.getStartOffset(),fd.getLength());
            next.setOnPreparedListener(p->{
                if(token!=epoch||p!=player||!playing){p.release();return;}
                if(Math.abs(p.getDuration()-clip.duration)>100){fail();return;}
                try {p.setPlaybackParams(new PlaybackParams().setSpeed((float)program.rate));p.start();}catch(Exception e){fail();}
            });
            next.setOnCompletionListener(p->{if(token==epoch&&p==player)main.postDelayed(()->clip(token,index+1),35);});
            next.setOnErrorListener((p,a,b)->{if(token==epoch&&p==player)fail();return true;});
            next.prepareAsync();
        }catch(Exception e){fail();}
    }
    private void done(int token){
        if(token!=epoch||!playing||program==null)return;
        releasePlayer();
        if(!program.advance||current>=program.steps.size()){pause("");return;}
        long delay=Math.max(0,program.pace-(SystemClock.elapsedRealtime()-began));
        main.postDelayed(()->{if(token==epoch&&playing){current++;read();}},delay);
    }
    private void control(String command){
        if(program==null||closed)return;
        if("stop".equals(command)){finish();return;}
        if("pause".equals(command)){pause("");return;}
        if("play".equals(command)){if(!playing)play();return;}
        if("next".equals(command)||"previous".equals(command)){
            boolean resume=playing;stopStep();current=Math.max(1,Math.min(program.steps.size(),current+("next".equals(command)?1:-1)));
            if(resume)read();else publish();
        }
    }
    private void pause(String reason){
        if(program==null||closed)return;
        playing=false;error=reason;stopStep();releaseFocus();publish();
        final int token=epoch;
        main.postDelayed(()->{if(token==epoch&&!playing)finish();},120000);
    }
    private void stopStep(){epoch++;main.removeCallbacksAndMessages(null);if(tts!=null)tts.stop();releasePlayer();if(wake!=null&&wake.isHeld())wake.release();}
    private void releasePlayer(){if(player!=null){try{player.release();}catch(Exception e){}player=null;}}
    private void releaseFocus(){if(audio!=null){if(Build.VERSION.SDK_INT>=26&&focus!=null)audio.abandonAudioFocusRequest(focus);else audio.abandonAudioFocus(focusChange);}}
    private void clearEngine(){stopStep();playing=false;ready=false;releaseFocus();if(tts!=null){tts.shutdown();tts=null;}if(starting!=null){Pending p=starting;starting=null;p.reply.failure();}}
    private void fail(){
        if(closed)return;
        pause("audio-unavailable");
        if(starting!=null){Pending p=starting;starting=null;p.reply.failure();finish();}
    }
    private void finish(){
        if(closed)return;
        clearEngine();closed=true;publish();program=null;
        if(media!=null)media.setActive(false);
        stopForeground(STOP_FOREGROUND_REMOVE);stopSelf();
    }
    private JSObject state(){
        if(program==null)return last;
        JSObject o=new JSObject();o.put("version","assembly-audio-state/1");o.put("session",program.session);o.put("sequenceHash",program.hash);o.put("current",current);o.put("total",program.steps.size());o.put("revision",revision);o.put("active",!closed);o.put("playing",playing&&!closed);o.put("error",error);return o;
    }
    private void publish(){
        if(program==null)return;revision++;last=state();
        getSharedPreferences("iprasm-assembly-audio-v1",MODE_PRIVATE).edit().putString("projectId",program.projectId).putString("sequenceHash",program.hash).putInt("current",current).putLong("updatedAt",System.currentTimeMillis()).apply();
        long actions=PlaybackState.ACTION_PLAY|PlaybackState.ACTION_PAUSE|PlaybackState.ACTION_STOP|PlaybackState.ACTION_SKIP_TO_NEXT|PlaybackState.ACTION_SKIP_TO_PREVIOUS;
        media.setPlaybackState(new PlaybackState.Builder().setActions(actions).setState(closed?PlaybackState.STATE_STOPPED:playing?PlaybackState.STATE_PLAYING:PlaybackState.STATE_PAUSED,(current-1)*program.pace,playing?1:0).build());
        media.setMetadata(new MediaMetadata.Builder().putString(MediaMetadata.METADATA_KEY_TITLE,program.steps.get(current-1).route).putString(MediaMetadata.METADATA_KEY_ARTIST,"Ip Rasm").putLong(MediaMetadata.METADATA_KEY_DURATION,program.steps.size()*program.pace).build());
        if(!closed)((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).notify(NOTICE,notification());
        if(observer!=null)observer.accept(last);
    }
    private String word(String command){
        if(program!=null&&"ru".equals(program.uiLocale))return "play".equals(command)?"Продолжить":"pause".equals(command)?"Пауза":"next".equals(command)?"Следующий":"previous".equals(command)?"Предыдущий":"Стоп";
        if(program!=null&&"uz-Cyrl".equals(program.uiLocale))return "play".equals(command)?"Давом этиш":"pause".equals(command)?"Тўхтатиб туриш":"next".equals(command)?"Кейинги":"previous".equals(command)?"Олдинги":"Ёпиш";
        if(program!=null&&"uz".equals(program.uiLocale))return "play".equals(command)?"Davom etish":"pause".equals(command)?"To‘xtatib turish":"next".equals(command)?"Keyingi":"previous".equals(command)?"Oldingi":"Yopish";
        return "play".equals(command)?"Play":"pause".equals(command)?"Pause":"next".equals(command)?"Next":"previous".equals(command)?"Previous":"Stop";
    }
    private PendingIntent action(String command){
        Intent i=new Intent(this,AssemblyAudioService.class).setData(android.net.Uri.parse("iprasm-audio://"+program.session+"/"+command)).putExtra("session",program.session).putExtra("command",command);
        return PendingIntent.getService(this,0,i,PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
    }
    private Notification notification(){
        Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(this,CHANNEL):new Notification.Builder(this);
        b.setSmallIcon(R.drawable.ic_notification).setContentTitle("Ip Rasm").setContentText(program.steps.get(current-1).route).setVisibility(Notification.VISIBILITY_PUBLIC).setOnlyAlertOnce(true).setOngoing(playing).setCategory(Notification.CATEGORY_TRANSPORT);
        Intent open=new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        b.setContentIntent(PendingIntent.getActivity(this,0,open,PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT));
        String command=playing?"pause":"play";
        b.addAction(new Notification.Action.Builder(android.R.drawable.ic_media_previous,word("previous"),action("previous")).build());
        b.addAction(new Notification.Action.Builder(playing?android.R.drawable.ic_media_pause:android.R.drawable.ic_media_play,word(command),action(command)).build());
        b.addAction(new Notification.Action.Builder(android.R.drawable.ic_media_next,word("next"),action("next")).build());
        b.addAction(new Notification.Action.Builder(android.R.drawable.ic_menu_close_clear_cancel,word("stop"),action("stop")).build());
        b.setDeleteIntent(action("stop"));
        b.setStyle(new Notification.MediaStyle().setMediaSession(media.getSessionToken()).setShowActionsInCompactView(0,1,2));
        return b.build();
    }
    @Override public IBinder onBind(Intent i){return null;}
    @Override public void onTaskRemoved(Intent i){finish();super.onTaskRemoved(i);}
    @Override public void onDestroy(){finish();io.shutdownNow();try{unregisterReceiver(noisy);}catch(Exception e){}if(media!=null)media.release();if(instance==this)instance=null;super.onDestroy();}
}
