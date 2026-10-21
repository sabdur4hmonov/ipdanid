package uz.iprasm.app;

import java.util.LinkedHashSet;

/** Monotonic bridge commands: a cancelled start or retired WebView cannot resume audio. */
final class AudioRequestFence {
    private String controller="";
    private int latest=0;
    private final LinkedHashSet<String> retired=new LinkedHashSet<>();
    String controller(){return controller;}
    int latest(){return latest;}
    boolean current(String id,int request){return controller.equals(id)&&request==latest;}
    boolean accept(String next,int request){
        if(next==null||!next.matches("[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}")||request<=0||retired.contains(next))return false;
        if(!next.equals(controller)){
            if(!controller.isEmpty())retired.add(controller);
            if(retired.size()>128)retired.remove(retired.iterator().next());
            controller=next;latest=0;
        }
        if(request<=latest)return false;
        latest=request;return true;
    }
}
