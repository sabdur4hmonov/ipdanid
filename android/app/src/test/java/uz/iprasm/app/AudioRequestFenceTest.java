package uz.iprasm.app;
import org.junit.Test;
import static org.junit.Assert.*;

public class AudioRequestFenceTest {
    private final String a="11111111-1111-4111-8111-111111111111";
    private final String b="22222222-2222-4222-8222-222222222222";
    @Test public void stopBarrierRejectsDelayedStartAndDuplicateCommands(){
        AudioRequestFence fence=new AudioRequestFence();
        assertTrue(fence.accept(a,1));assertTrue(fence.current(a,1));
        assertTrue(fence.accept(a,3));assertFalse(fence.current(a,1));
        assertFalse(fence.accept(a,2));assertFalse(fence.accept(a,3));
        assertTrue(fence.accept(a,4));
    }
    @Test public void retiredControllerCannotStopOrReplaceNewWebView(){
        AudioRequestFence fence=new AudioRequestFence();
        assertTrue(fence.accept(a,9));assertTrue(fence.accept(b,1));
        assertFalse(fence.accept(a,100));assertTrue(fence.current(b,1));
        assertTrue(fence.accept(b,2));assertFalse(fence.current(a,100));
    }
    @Test public void malformedRequestsDoNotRetireLiveController(){
        AudioRequestFence fence=new AudioRequestFence();
        assertFalse(fence.accept(a,0));assertFalse(fence.accept("------------------------------------",1));
        assertTrue(fence.accept(a,1));assertFalse(fence.accept(b,-3));
        assertTrue(fence.current(a,1));assertTrue(fence.accept(a,2));
    }
}
