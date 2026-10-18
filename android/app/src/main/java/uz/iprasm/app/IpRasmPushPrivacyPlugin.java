package uz.iprasm.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;

@CapacitorPlugin(name = "IpRasmPushPrivacy")
public class IpRasmPushPrivacyPlugin extends Plugin {
    @PluginMethod public void revoke(PluginCall call) {
        // No Firebase config is a normal installation, not an initialization request.
        if (FirebaseApp.getApps(getContext()).isEmpty()) { call.resolve(); return; }
        FirebaseMessaging messaging = FirebaseMessaging.getInstance();
        messaging.setAutoInitEnabled(false);
        messaging.deleteToken().addOnCompleteListener(task -> {
            if (task.isSuccessful()) call.resolve();
            else call.reject("Notification cleanup could not finish");
        });
    }
}
