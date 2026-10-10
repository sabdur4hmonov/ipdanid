package uz.iprasm.app;

import static org.junit.Assert.*;
import android.accessibilityservice.AccessibilityService;
import android.graphics.Bitmap;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.PixelCopy;
import android.view.MotionEvent;
import android.view.InputDevice;
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
    private String button(String text){return "[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||b.innerText.trim())==="+JSONObject.quote(text)+"&&b.offsetParent!==null&&!b.disabled)";}
    private void click(String text) throws Exception {String expression=button(text);await(expression,30000);assertEquals("true",js("(()=>{const b="+expression+";b.scrollIntoView({block:'center'});b.click();return true;})()"));}
    private void input(String selector,String value) throws Exception {
        await("document.querySelector("+JSONObject.quote(selector)+")",30000);
        assertEquals("true",js("(()=>{const e=document.querySelector("+JSONObject.quote(selector)+");const p=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,"+JSONObject.quote(value)+");e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true;})()"));
    }
    private void start() throws Exception {
        scenario=ActivityScenario.launch(MainActivity.class);
        // Keep this synthetic test window awake; never change the user's global timeout or bypass a lock.
        scenario.onActivity(activity->activity.getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON));
        await("document.querySelector('select[aria-label=\"Language\"]')",60000);input("select[aria-label=\"Language\"]","en");await(button("Create"),30000);
    }
    private void sampleForDetailedChecks() throws Exception {
        assertEquals("true",js("(()=>{document.querySelector('.more-menu').open=true;return true;})()"));
        click("Try an original sample");
        await("document.querySelector('canvas[aria-label=\"Edited photo\"]')",30000);
        // These historical checks exercise optional crop/material controls deliberately.
        assertEquals("true",js("(()=>{for(const s of ['[data-testid=advanced-photo]','[data-testid=advanced-generation]','.crop-options']) document.querySelector(s).open=true;return true;})()"));
    }
    @Test public void photoFirstStartShowsOnlyTwoSourceActions() throws Exception {
        try {
            start();
            assertEquals("2",js("[...document.querySelectorAll('main button')].filter(b=>b.offsetParent!==null).length"));
            await(button("Take photo"),30000);await(button("Upload from gallery"),30000);
            assertEquals("true",js("!document.querySelector('.settings-card')&&!document.querySelector('.result-card')"));
            assertEquals("true",js("(()=>{const i=document.querySelector('[data-testid=\"native-photo-capture\"]');return i.accept==='image/*'&&i.capture==='environment';})()"));
        } finally {if(scenario!=null)scenario.close();}
    }
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
            start();sampleForDetailedChecks();click("Circle");click("Lighter");
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
            start();assertEquals("true",js("(()=>{document.querySelector('.more-menu').open=true;return true;})()"));click("Account & shop");
            await("document.querySelector('.customer-hub')",30000);
            // Existing owner sessions are kept; test only creates a guest on a fresh app.
            if("true".equals(js("Boolean("+button("Start sandbox session")+")")))click("Start sandbox session");
            await("document.querySelector('[data-testid=\"customer-credits\"]')",30000);click("Support");
            input(".customer-fields input","Device sandbox smoke test");input(".customer-fields textarea","Synthetic local support record, no external delivery.");click("Save local support request");
            await("document.querySelector('.customer-hub').innerText.includes('Synthetic local support record')",30000);
            scenario.recreate();await(button("Create"),60000);assertEquals("true",js("(()=>{document.querySelector('.more-menu').open=true;return true;})()"));click("Account & shop");await("document.querySelector('[data-testid=\"customer-credits\"]')",30000);click("Support");
            await("document.querySelector('.customer-hub').innerText.includes('Synthetic local support record')",30000);assertEquals("true",js("document.documentElement.scrollWidth<=innerWidth"));screenshot("product-device-customer.png");
            Files.write(new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir(),"product-device-customer.json").toPath(),"{\"nativeHttpAndPreferences\":true,\"realMessagesSent\":false}".getBytes(StandardCharsets.UTF_8));
        }finally{if(scenario!=null)scenario.close();}
    }
    private boolean nativeFocused() {
        AtomicReference<Boolean> focused=new AtomicReference<>(false);
        scenario.onActivity(a->focused.set(a.getWindow().getDecorView().hasWindowFocus()));
        return focused.get();
    }
    private void awaitNativeFocus(boolean expected) {
        long until=SystemClock.elapsedRealtime()+30000;
        while(SystemClock.elapsedRealtime()<until){if(nativeFocused()==expected)return;SystemClock.sleep(250);}
        fail("Native picker focus transition missing: "+expected);
    }
    private void nativeTap(String selector) throws Exception {
        js("document.querySelector("+JSONObject.quote(selector)+").scrollIntoView({block:'center'})");SystemClock.sleep(500);
        JSONObject point=new JSONObject(js("(()=>{const r=document.querySelector("+JSONObject.quote(selector)+").getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,width:innerWidth};})()"));
        AtomicReference<float[]> xy=new AtomicReference<>();
        scenario.onActivity(a->{android.webkit.WebView v=a.getBridge().getWebView();int[] location=new int[2];v.getLocationOnScreen(location);float scale=(float)(v.getWidth()/point.optDouble("width"));xy.set(new float[]{location[0]+(float)point.optDouble("x")*scale,location[1]+(float)point.optDouble("y")*scale});});
        long time=SystemClock.uptimeMillis();MotionEvent down=MotionEvent.obtain(time,time,MotionEvent.ACTION_DOWN,xy.get()[0],xy.get()[1],0);down.setSource(InputDevice.SOURCE_TOUCHSCREEN);
        assertTrue(InstrumentationRegistry.getInstrumentation().getUiAutomation().injectInputEvent(down,true));down.recycle();SystemClock.sleep(100);
        MotionEvent up=MotionEvent.obtain(time,SystemClock.uptimeMillis(),MotionEvent.ACTION_UP,xy.get()[0],xy.get()[1],0);up.setSource(InputDevice.SOURCE_TOUCHSCREEN);
        assertTrue(InstrumentationRegistry.getInstrumentation().getUiAutomation().injectInputEvent(up,true));up.recycle();
    }
    @Test public void packagedOutlineAndCancelledNativePhotoPickerPreserveSource() throws Exception {
        try {
            start();click("Create");sampleForDetailedChecks();click("Heart");
            await("document.querySelector('[data-testid=\"shape-crop\"]')",30000);
            assertEquals("true",js("(()=>{const d=document.querySelector('.head-outline-controls');d.open=true;return true;})()"));
            click("Mark outline points");
            assertEquals("true",js("(()=>{const el=document.querySelector('[data-testid=\"shape-crop\"]'),r=el.getBoundingClientRect(),capture=el.setPointerCapture;el.setPointerCapture=()=>{};try{for(let j=0;j<8;j++){const a=j*Math.PI/4;for(const type of ['pointerdown','pointerup'])el.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:91,clientX:r.left+r.width*(.5+.22*Math.cos(a)),clientY:r.top+r.height*(.47+.3*Math.sin(a))}));}}finally{el.setPointerCapture=capture;}return true;})()"));
            await("JSON.parse(document.querySelector('[data-testid=\"shape-crop\"]').dataset.outline).length===8",30000);
            String outline=js("document.querySelector('[data-testid=\"shape-crop\"]').dataset.outline"),crop=js("document.querySelector('[data-testid=\"shape-crop\"]').dataset.edits");
            click("Fit marked outline");
            assertEquals(outline,js("document.querySelector('[data-testid=\"shape-crop\"]').dataset.outline"));
            assertNotEquals(crop,js("document.querySelector('[data-testid=\"shape-crop\"]').dataset.edits"));
            click("Undo shape fit");assertEquals(crop,js("document.querySelector('[data-testid=\"shape-crop\"]').dataset.edits"));
            String source=js("document.querySelector('canvas[aria-label=\"Edited photo\"]').toDataURL()");
            awaitNativeFocus(true);
            // Open the real Android file chooser and cancel without reading private media or granting access.
            nativeTap("button.floating[aria-label='Upload a photo']");
            awaitNativeFocus(false);
            assertTrue(InstrumentationRegistry.getInstrumentation().getUiAutomation().performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK));
            awaitNativeFocus(true);await("document.querySelector('canvas[aria-label=\"Edited photo\"]')",30000);
            assertEquals(source,js("document.querySelector('canvas[aria-label=\"Edited photo\"]').toDataURL()"));
            assertEquals(outline,js("document.querySelector('[data-testid=\"shape-crop\"]').dataset.outline"));
            assertEquals(crop,js("document.querySelector('[data-testid=\"shape-crop\"]').dataset.edits"));
            JSONObject evidence=new JSONObject();evidence.put("nativeOutlineFitUndo",true);evidence.put("burstSourcePoints",8);evidence.put("actualNativePickerCancelled",true);evidence.put("sourcePreserved",true);evidence.put("privateMediaRead",false);
            evidence.put("webSpeechSynthesisAvailable","true".equals(js("Boolean(window.speechSynthesis)")));
            evidence.put("webVoiceCount",Integer.parseInt(js("window.speechSynthesis?.getVoices().length??0")));
            File cache=InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir();Files.write(new File(cache,"outline-device.json").toPath(),evidence.toString(2).getBytes(StandardCharsets.UTF_8));
            screenshot("outline-device-crop.png");
        }finally{if(scenario!=null)scenario.close();}
    }
    @Test public void actualNativeCameraCancellationPreservesPhotoAndCrop() throws Exception {
        try {
            start();click("Create");sampleForDetailedChecks();
            await("document.querySelector('canvas[aria-label=\"Edited photo\"]')",30000);
            input("input[aria-label=\"Zoom\"]","1.2");
            String source=js("document.querySelector('canvas[aria-label=\"Edited photo\"]').toDataURL()"),
                crop=js("document.querySelector('[data-testid=\"shape-crop\"]').dataset.edits");
            assertEquals("true",js("(()=>{const i=document.querySelector('[data-testid=\"native-photo-capture\"]');return i.accept==='image/*'&&i.capture==='environment';})()"));
            AtomicReference<Boolean> available=new AtomicReference<>(false);
            scenario.onActivity(activity->available.set(new android.content.Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE).resolveActivity(activity.getPackageManager())!=null));
            assertTrue("Native camera intent unavailable",available.get());
            awaitNativeFocus(true);nativeTap(".photo-actions button.outline");awaitNativeFocus(false);
            assertTrue(InstrumentationRegistry.getInstrumentation().getUiAutomation().performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK));
            awaitNativeFocus(true);
            await("document.querySelector('canvas[aria-label=\"Edited photo\"]')",30000);
            assertEquals(source,js("document.querySelector('canvas[aria-label=\"Edited photo\"]').toDataURL()"));
            assertEquals(crop,js("document.querySelector('[data-testid=\"shape-crop\"]').dataset.edits"));
            JSONObject evidence=new JSONObject();evidence.put("nativeCameraIntentAvailable",true);evidence.put("actualNativeCameraOpenedAndCancelled",true);evidence.put("sourceAndCropPreserved",true);evidence.put("successfulPersonalCaptureTested",false);evidence.put("privateMediaRead",false);
            File cache=InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir();Files.write(new File(cache,"camera-device.json").toPath(),evidence.toString(2).getBytes(StandardCharsets.UTF_8));
            screenshot("camera-device-app.png");
        }finally{if(scenario!=null)scenario.close();}
    }
    private JSONObject speechStatus() throws Exception {
        js("window.__speechStatus=null;window.Capacitor.nativePromise('IpRasmSpeech','status',{}).then(v=>window.__speechStatus=v)");
        await("window.__speechStatus",30000);return new JSONObject(js("window.__speechStatus"));
    }
    @Test public void nativeSpeechUsesInstalledVoiceAndNeverConfirmsWork() throws Exception {
        try {
            start();click("Create");sampleForDetailedChecks();click("Circle");click("Lighter");click("Calculate thread path");await(button("Save & assemble"),180000);
            input("#project-name","Device speech test "+System.currentTimeMillis());click("Save & assemble");await("document.querySelector('[data-testid=\"confirmed-step\"]')",30000);
            js("window.__nativeVoices=null;window.Capacitor.nativePromise('IpRasmSpeech','voices',{}).then(v=>window.__nativeVoices=v)");await("window.__nativeVoices",30000);
            JSONObject voices=new JSONObject(js("window.__nativeVoices"));org.json.JSONArray list=voices.getJSONArray("voices");
            int english=0;for(int j=0;j<list.length();j++)if(list.getJSONObject(j).getString("lang").startsWith("en"))english++;
            assertTrue("Install an offline English device voice before accepting audible guidance",english>0);
            await("(()=>{const e=[...document.querySelectorAll('label')].find(l=>l.innerText.trim()==='Voice guidance')?.querySelector('input[type=checkbox]');return e&&!e.disabled;})()",30000);
            awaitNativeFocus(true);
            JSONObject before=speechStatus();
            js("[...document.querySelectorAll('label')].find(l=>l.innerText.trim()==='Voice guidance').querySelector('input[type=checkbox]').click()");
            long end=SystemClock.elapsedRealtime()+30000;JSONObject state=speechStatus();while(state.getInt("starts")<=before.getInt("starts")&&SystemClock.elapsedRealtime()<end){SystemClock.sleep(250);state=speechStatus();}
            assertTrue("Device TTS must report an actual utterance start; status="+state.toString()+"; UI="+js("JSON.stringify({enabled:[...document.querySelectorAll('label')].find(l=>l.innerText.trim()==='Voice guidance')?.querySelector('input[type=checkbox]')?.checked,error:document.querySelector('[role=alert]')?.innerText})"),state.getInt("starts")>before.getInt("starts"));
            // Let the complete phrase finish before cancellation/rejection checks.
            // An utterance-start callback alone cannot prove audible, complete guidance.
            end=SystemClock.elapsedRealtime()+30000;
            while(speechStatus().getBoolean("speaking")&&SystemClock.elapsedRealtime()<end)SystemClock.sleep(250);
            assertFalse("Guide speech did not finish",speechStatus().getBoolean("speaking"));
            if("true".equals(InstrumentationRegistry.getArguments().getString("humanListen"))){
                for(int attempt=0;attempt<3;attempt++){
                    click("Repeat");SystemClock.sleep(1000);
                    end=SystemClock.elapsedRealtime()+30000;
                    while(speechStatus().getBoolean("speaking")&&SystemClock.elapsedRealtime()<end)SystemClock.sleep(250);
                    assertFalse(speechStatus().getBoolean("speaking"));SystemClock.sleep(1000);
                }
            }
            assertEquals("true",js("document.querySelector('[data-testid=\"confirmed-step\"]').innerText.startsWith('0/')"));
            // Reject an English voice for a different language; a stale request must not queue speech.
            state=speechStatus();
            JSONObject chosen=null;for(int j=0;j<list.length();j++)if(list.getJSONObject(j).getString("lang").startsWith("en")){chosen=list.getJSONObject(j);break;}
            JSONObject bad=new JSONObject();bad.put("session",state.getString("session"));bad.put("requestId",state.getInt("latestRequestId")+1);bad.put("voiceId",chosen.getString("id"));bad.put("language","uz");bad.put("rate",1);bad.put("text","Synthetic language rejection test");
            js("window.__speechRejected=false;window.Capacitor.nativePromise('IpRasmSpeech','speak',"+bad.toString()+").catch(()=>window.__speechRejected=true)");await("window.__speechRejected",30000);
            bad.put("requestId",state.getInt("latestRequestId")-1);bad.put("language","en");
            js("window.__staleSpeech=null;window.Capacitor.nativePromise('IpRasmSpeech','speak',"+bad.toString()+").then(v=>window.__staleSpeech=v)");await("window.__staleSpeech",30000);assertEquals("false",js("window.__staleSpeech.queued"));
            click("Create");assertFalse(speechStatus().getBoolean("speaking"));
            JSONObject evidence=new JSONObject();evidence.put("deviceOfflineEnglishVoices",english);evidence.put("nativeUtteranceStarted",true);evidence.put("wrongLanguageRejected",true);evidence.put("staleRequestRejected",true);evidence.put("navigationStoppedSpeech",true);evidence.put("confirmationUnchanged",true);evidence.put("speechErrors",speechStatus().getInt("errors"));evidence.put("humanAudibilityVerified",false);
            Files.write(new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir(),"speech-device.json").toPath(),evidence.toString(2).getBytes(StandardCharsets.UTF_8));
        }finally{if(scenario!=null)scenario.close();}
    }
}
