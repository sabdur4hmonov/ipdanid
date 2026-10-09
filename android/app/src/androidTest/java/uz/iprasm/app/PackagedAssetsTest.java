package uz.iprasm.app;

import static org.junit.Assert.*;
import android.content.Context;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Packaged-asset device smoke check. Compilation is not device execution. */
@RunWith(AndroidJUnit4.class)
public class PackagedAssetsTest {
    private byte[] read(InputStream stream) throws Exception {
        ByteArrayOutputStream result = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int n;
        while ((n = stream.read(buffer)) != -1) result.write(buffer, 0, n);
        return result.toByteArray();
    }
    @Test
    public void localPersonSegmentationAssetsArePackaged() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        String root = "public/vendor/portrait-segmentation/";
        for (String name : new String[]{"vision_bundle.js", "wasm/vision_wasm_internal.js", "wasm/vision_wasm_internal.wasm", "wasm/vision_wasm_nosimd_internal.js", "wasm/vision_wasm_nosimd_internal.wasm", "LICENSE.txt", "PROVENANCE.json"}) {
            try (InputStream input = context.getAssets().open(root + name)) { assertTrue(name, read(input).length > 100); }
        }
        try (InputStream input = context.getAssets().open(root + "selfie_multiclass_256x256.tflite")) {
            byte[] bytes=read(input);assertEquals(16371837,bytes.length);
            byte[] hash=MessageDigest.getInstance("SHA-256").digest(bytes);StringBuilder hex=new StringBuilder();
            for(byte b:hash)hex.append(String.format("%02x",b & 255));
            assertEquals("c6748b1253a99067ef71f7e26ca71096cd449baefa8f101900ea23016507e0e0",hex.toString());
        }
        try (InputStream input = context.getAssets().open(root + "face_landmarker.task")) {
            byte[] bytes=read(input);assertEquals(3758596,bytes.length);
            byte[] hash=MessageDigest.getInstance("SHA-256").digest(bytes);StringBuilder hex=new StringBuilder();
            for(byte b:hash)hex.append(String.format("%02x",b & 255));
            assertEquals("64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff",hex.toString());
        }
        boolean photoWorker=false;
        try (InputStream input = context.getAssets().open(root + "deeplab_v3.tflite")) {
            byte[] bytes=read(input);assertEquals(2780176,bytes.length);
            byte[] hash=MessageDigest.getInstance("SHA-256").digest(bytes);StringBuilder hex=new StringBuilder();
            for(byte b:hash)hex.append(String.format("%02x",b & 255));
            assertEquals("ff36e24d40547fe9e645e2f4e8745d1876d6e38b332d39a82f0bf0f5d1d561b3",hex.toString());
        }
        for(String asset:context.getAssets().list("public/assets")) {
            if(asset.startsWith("photo-prepare.worker-") && asset.endsWith(".js")) photoWorker=true;
        }
        assertTrue("Photo preparation must be packaged for offline use",photoWorker);
    }
    @Test
    public void offlineEngineAndFontArePackaged() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("uz.iprasm.app", context.getPackageName());
        try (InputStream input = context.getAssets().open("public/index.html")) {
            String html = new String(read(input), StandardCharsets.UTF_8);
            assertTrue(html.contains("type=\"module\""));
            assertTrue(html.contains("/assets/index-"));
        }
        boolean engine = false;
        for (String asset : context.getAssets().list("public/assets")) {
            if (asset.startsWith("generator.worker-") && asset.endsWith(".js")) {
                try (InputStream input = context.getAssets().open("public/assets/" + asset)) {
                    String worker = new String(read(input), StandardCharsets.UTF_8);
                    assertTrue("Portrait algorithm must be current", worker.contains("greedy-optical/4"));
                    assertTrue("Guarded continuous basis must be packaged", worker.contains("continuous-guarded/6"));
                    assertTrue("Multiscale portrait fitting must be packaged", worker.contains("density-multiscale/7"));
                    assertTrue("Versioned distribution and contrast settings must be packaged", worker.contains("pairLimit") && worker.contains("pinDegreeLimit") && worker.contains("contrastScales"));
                    assertTrue("Supply estimate policy must be packaged", worker.contains("stockPolicy"));
                    assertTrue("Immutable refinement lineage must be packaged", worker.contains("parentSequenceHash"));
                }
                engine = true;
            }
        }
        assertTrue("Real Worker engine must be available offline", engine);
        try (InputStream font = context.getAssets().open("public/fonts/NotoSans-Regular.ttf")) {
            assertTrue("Export font must be available offline", read(font).length > 100000);
        }
    }
}
