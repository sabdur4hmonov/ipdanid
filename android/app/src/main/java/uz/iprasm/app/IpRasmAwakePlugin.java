package uz.iprasm.app;
import android.view.WindowManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
/** App window only: never edits the device's global screen timeout. */
@CapacitorPlugin(name="IpRasmAwake")
public class IpRasmAwakePlugin extends Plugin {
 private boolean desired=false;
 @PluginMethod public void set(PluginCall call){final boolean enabled=Boolean.TRUE.equals(call.getBoolean("enabled",false));getActivity().runOnUiThread(()->{desired=enabled;if(enabled)getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);call.resolve();});}
 @Override protected void handleOnResume(){if(desired)getActivity().runOnUiThread(()->getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON));}
 @Override protected void handleOnPause(){getActivity().runOnUiThread(()->getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON));}
 @Override protected void handleOnDestroy(){getActivity().runOnUiThread(()->getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON));}
}
