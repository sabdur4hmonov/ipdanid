package uz.iprasm.app;

import static org.junit.Assert.*;
import android.accessibilityservice.AccessibilityService;
import android.graphics.Bitmap;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.PixelCopy;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Actual packaged WebView/Worker/Preferences/Filesystem/Share tests. No personal photo or real message. */
@RunWith(AndroidJUnit4.class)
public class CoreWorkflowTest {
    private ActivityScenario<MainActivity> scenario;
    private String js(String expression) throws Exception {
        CountDownLatch latch=new CountDownLatch(1);AtomicReference<String> result=new AtomicReference<>();
        scenario.onActivity(activity->activity.getBridge().getWebView().evaluateJavascript(expression,value->{result.set(value);latch.countDown();}));
        assertTrue("WebView callback timed out",latch.await(12,TimeUnit.SECONDS));return result.get();
    }
    private void await(String expression,long timeout) throws Exception {
        long end=SystemClock.elapsedRealtime()+timeout;
        while(SystemClock.elapsedRealtime()<end){if("true".equals(js("Boolean("+expression+")")))return;SystemClock.sleep(250);}
        fail("Visible application condition timed out: "+expression);
    }
    private String button(String text){return "[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==="+JSONObject.quote(text)+"&&b.offsetParent!==null&&!b.disabled)";}
    private void click(String text) throws Exception {String expression=button(text);await(expression,30000);assertEquals("true",js("(()=>{const b="+expression+";b.scrollIntoView({block:'center'});b.click();return true;})()"));}
    private void input(String selector,String value) throws Exception {
        await("document.querySelector("+JSONObject.quote(selector)+")",30000);
        assertEquals("true",js("(()=>{const e=document.querySelector("+JSONObject.quote(selector)+");const p=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,"+JSONObject.quote(value)+");e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true;})()"));
    }
    private void start() throws Exception {scenario=ActivityScenario.launch(MainActivity.class);await("document.querySelector('select[aria-label=\"Language\"]')",60000);input("select[aria-label=\"Language\"]","en");await(button("Create"),30000);}
    private void screenshot(String name) throws Exception {
        // Capture our app window only; system notification overlays can contain private unrelated messages.
        js("window.scrollTo(0,0)");SystemClock.sleep(750);
        CountDownLatch latch=new CountDownLatch(1);AtomicReference<Bitmap> capture=new AtomicReference<>();AtomicReference<Integer> status=new AtomicReference<>();
        scenario.onActivity(activity->{Bitmap bitmap=Bitmap.createBitmap(activity.getWindow().getDecorView().getWidth(),activity.getWindow().getDecorView().getHeight(),Bitmap.Config.ARGB_8888);capture.set(bitmap);PixelCopy.request(activity.getWindow(),bitmap,value->{status.set(value);latch.countDown();},new Handler(Looper.getMainLooper()));});
        assertTrue("App window screenshot timed out",latch.await(10,TimeUnit.SECONDS));assertEquals(Integer.valueOf(PixelCopy.SUCCESS),status.get());Bitmap bitmap=capture.get();assertNotNull(bitmap);
        File file=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir(),name);
        try(FileOutputStream stream=new FileOutputStream(file)){assertTrue(bitmap.compress(Bitmap.CompressFormat.PNG,100,stream));}bitmap.recycle();
    }
    @Test public void realWorkerProgressBookmarksAndNativeExports() throws Exception {
        try {
            start();click("Try an original sample");click("Circle");click("Lighter");
            long began=SystemClock.elapsedRealtime();click("Calculate thread path");await(button("Save & assemble"),180000);long generationMs=SystemClock.elapsedRealtime()-began;
            input("#project-name","Device smoke test "+System.currentTimeMillis());click("Save & assemble");await("document.querySelector('[data-testid=\"confirmed-step\"]')",30000);
            String hash=js("document.querySelector('[data-testid=\"player-hash\"]').innerText");
            input("#jump","10");await("document.querySelector('#jump').value==='10'",10000);click("Confirm completed through this step");
            await("document.querySelector('[data-testid=\"confirmed-step\"]').innerText.startsWith('10/')",30000);
            // Confirmation advances the announced step to11. Deliberately return to10 before bookmarking.
            input("#jump","10");input(".assembly-navigation input","Device bookmark");click("Bookmark this step");
            await(button("10 · Device bookmark"),30000);await("document.querySelector('[data-testid=\"library-save-state\"]').dataset.state==='saved'",30000);
            scenario.recreate();await(button("My projects"),60000);click("My projects");click("Resume");
            await("document.querySelector('[data-testid=\"confirmed-step\"]').innerText.startsWith('10/')",30000);
            assertEquals(hash,js("document.querySelector('[data-testid=\"player-hash\"]').innerText"));click("10 · Device bookmark");
            assertEquals("true",js("document.documentElement.scrollWidth<=innerWidth"));screenshot("product-device-assembly.png");
            File cache=InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir();
            File json=new File(cache,"ip-rasm.json");long oldJson=json.exists()?json.lastModified():0;click("Project JSON");
            long until=SystemClock.elapsedRealtime()+30000;while((!json.exists()||json.lastModified()<=oldJson)&&SystemClock.elapsedRealtime()<until)SystemClock.sleep(250);
            assertTrue("Native JSON export missing",json.exists()&&json.lastModified()>oldJson);JSONObject exported=new JSONObject(new String(Files.readAllBytes(json.toPath()),StandardCharsets.UTF_8));
            assertEquals("iprasm.project/1",exported.getString("schema"));assertEquals(10,exported.getJSONObject("project").getJSONObject("progress").getInt("confirmed"));
            assertEquals(new JSONObject("{\"hash\":"+hash+"}").getString("hash"),exported.getJSONObject("project").getJSONObject("instruction").getString("sequenceHash"));
            SystemClock.sleep(1000);assertTrue(InstrumentationRegistry.getInstrumentation().getUiAutomation().performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK));
            await(button("PDF guide"),30000);File pdf=new File(cache,"ip-rasm-guide.pdf");long oldPdf=pdf.exists()?pdf.lastModified():0;click("PDF guide");
            until=SystemClock.elapsedRealtime()+90000;while((!pdf.exists()||pdf.lastModified()<=oldPdf)&&SystemClock.elapsedRealtime()<until)SystemClock.sleep(250);
            assertTrue("Native PDF export missing",pdf.exists()&&pdf.lastModified()>oldPdf);byte[] pdfBytes=Files.readAllBytes(pdf.toPath());assertEquals("%PDF-",new String(pdfBytes,0,5,StandardCharsets.US_ASCII));
            assertTrue("PDF must be a complete document",new String(pdfBytes,Math.max(0,pdfBytes.length-128),Math.min(128,pdfBytes.length),StandardCharsets.US_ASCII).contains("%%EOF"));
            SystemClock.sleep(1000);InstrumentationRegistry.getInstrumentation().getUiAutomation().performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK);
            JSONObject evidence=new JSONObject();evidence.put("generationMs",generationMs);evidence.put("nativePreferencesRecreation",true);evidence.put("nativeJsonAndPdf",true);evidence.put("personalPhotoUsed",false);evidence.put("physicalAssemblyValidated",false);
            Files.write(new File(cache,"product-device-core.json").toPath(),evidence.toString(2).getBytes(StandardCharsets.UTF_8));
        }finally{if(scenario!=null)scenario.close();}
    }
    @Test public void nativeSandboxSessionAndSupportSurviveActivityRecreation() throws Exception {
        try {
            start();click("Account & shop");
            await("document.querySelector('.customer-hub')",30000);
            // Existing owner sessions are kept; test only creates a guest on a fresh app.
            if("true".equals(js("Boolean("+button("Start sandbox session")+")")))click("Start sandbox session");
            await("document.querySelector('[data-testid=\"customer-credits\"]')",30000);click("Support");
            input(".customer-fields input","Device sandbox smoke test");input(".customer-fields textarea","Synthetic local support record, no external delivery.");click("Save local support request");
            await("document.querySelector('.customer-hub').innerText.includes('Synthetic local support record')",30000);
            scenario.recreate();await(button("Account & shop"),60000);click("Account & shop");await("document.querySelector('[data-testid=\"customer-credits\"]')",30000);click("Support");
            await("document.querySelector('.customer-hub').innerText.includes('Synthetic local support record')",30000);assertEquals("true",js("document.documentElement.scrollWidth<=innerWidth"));screenshot("product-device-customer.png");
            Files.write(new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir(),"product-device-customer.json").toPath(),"{\"nativeHttpAndPreferences\":true,\"realMessagesSent\":false}".getBytes(StandardCharsets.UTF_8));
        }finally{if(scenario!=null)scenario.close();}
    }
}
