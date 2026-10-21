package uz.iprasm.app;

import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;

/** Private, bounded spoken instructions only. Never receives a photo or confirmation state. */
final class AssemblyAudioProgram {
    static final class Step {
        final String text, route;
        final int[] clips;
        Step(String text, String route, int[] clips) { this.text=text; this.route=route; this.clips=clips; }
    }
    static final class Clip {
        final String path, sha;
        final int bytes, duration;
        Clip(JSONObject c, String language) throws Exception {
            keys(c,"path","sha256","bytes","durationMs");
            path=c.getString("path"); sha=c.getString("sha256");
            bytes=integer(c,"bytes",44,1500000); duration=integer(c,"durationMs",20,30000);
            if(!path.matches("/voices/"+language+"/instructor-[ab]/[a-z0-9-]+\\.wav") || !sha.matches("[a-f0-9]{64}")) throw new Exception();
        }
    }
    final String session, hash, projectId, language, uiLocale, voice;
    final double rate;
    final long pace;
    final int current;
    final boolean advance;
    final List<Step> steps=new ArrayList<>();
    final List<Clip> clips=new ArrayList<>();
    static void keys(JSONObject o, String... names) throws Exception {
        List<String> allowed=Arrays.asList(names);
        java.util.Iterator<String> it=o.keys();
        while(it.hasNext()) if(!allowed.contains(it.next())) throw new Exception();
        if(o.length()!=names.length) throw new Exception();
    }
    static int integer(JSONObject o, String key, int min, int max) throws Exception {
        double n=o.getDouble(key);
        if(!Double.isFinite(n)||n!=Math.floor(n)||n<min||n>max)throw new Exception();
        return (int)n;
    }
    AssemblyAudioProgram(JSONObject o) throws Exception {
        if(o.toString().length()>12000000)throw new Exception();
        keys(o,"version","session","sequenceHash","projectId","language","uiLocale","voiceId","rate","pace","current","advance","clips","steps");
        if(!"assembly-audio/1".equals(o.getString("version")))throw new Exception();
        session=o.getString("session");hash=o.getString("sequenceHash");language=o.getString("language");uiLocale=o.getString("uiLocale");voice=o.getString("voiceId");
        if(!Arrays.asList("uz","uz-Cyrl","ru","en").contains(uiLocale))throw new Exception();
        projectId=o.getString("projectId");if(projectId.trim().isEmpty()||projectId.length()>200||projectId.matches("(?s).*[\\x00-\\x1f\\x7f].*"))throw new Exception();
        if(!session.matches("[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}")||!hash.matches("[a-f0-9]{64}")||!Arrays.asList("uz","ru","en").contains(language)||voice.length()>200)throw new Exception();
        rate=o.getDouble("rate");double seconds=o.getDouble("pace");
        if(!Double.isFinite(rate)||rate<.5||rate>1.5||!Double.isFinite(seconds)||seconds<2||seconds>120)throw new Exception();
        pace=(long)(seconds*1000);advance=o.getBoolean("advance");
        JSONArray c=o.getJSONArray("clips"), s=o.getJSONArray("steps");
        if(c.length()>512||s.length()<1||s.length()>20000)throw new Exception();
        current=integer(o,"current",1,s.length());
        long totalBytes=0;HashSet<String> paths=new HashSet<>();
        for(int k=0;k<c.length();k++){
            Clip clip=new Clip(c.getJSONObject(k),language);totalBytes+=clip.bytes;
            if(totalBytes>32*1024*1024||!paths.add(clip.path))throw new Exception();
            clips.add(clip);
        }
        if(clips.isEmpty()==voice.isEmpty())throw new Exception();
        for(int k=0;k<s.length();k++){
            JSONObject row=s.getJSONObject(k);keys(row,"text","route","clips");
            String text=row.getString("text"),route=row.getString("route");JSONArray ids=row.getJSONArray("clips");
            if(text.trim().isEmpty()||text.length()>600||!route.matches("(?:[A-Z]-[0-9]{1,4}|[0-9]{1,5}) → (?:[A-Z]-[0-9]{1,4}|[0-9]{1,5})")||ids.length()>32||(!clips.isEmpty()&&ids.length()==0)|| (clips.isEmpty()&&ids.length()!=0))throw new Exception();
            int[] indices=new int[ids.length()];double duration=0;
            for(int j=0;j<indices.length;j++){
                double id=ids.getDouble(j);
                if(id!=Math.floor(id)||id<0||id>=clips.size())throw new Exception();
                indices[j]=(int)id;duration+=clips.get(indices[j]).duration/rate+35;
            }
            if(duration>120000)throw new Exception();
            steps.add(new Step(text,route,indices));
        }
    }
}
