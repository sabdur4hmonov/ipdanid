package uz.iprasm.app;

import static org.junit.Assert.*;
import android.content.Context;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
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
            if (asset.startsWith("generator.worker-") && asset.endsWith(".js")) engine = true;
        }
        assertTrue("Real Worker engine must be available offline", engine);
        try (InputStream font = context.getAssets().open("public/fonts/NotoSans-Regular.ttf")) {
            assertTrue("Export font must be available offline", read(font).length > 100000);
        }
    }
}
