import UIKit
import Capacitor
#if canImport(FirebaseMessaging)
import FirebaseMessaging
import FirebaseCore
#endif

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = IpRasmBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

class IpRasmBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(IpRasmPushPrivacyPlugin())
    }
}

@objc(IpRasmPushPrivacyPlugin)
public class IpRasmPushPrivacyPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "IpRasmPushPrivacyPlugin"
    public let jsName = "IpRasmPushPrivacy"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "revoke", returnType: CAPPluginReturnPromise)]
    @objc func revoke(_ call: CAPPluginCall) {
        #if canImport(FirebaseMessaging)
        guard FirebaseApp.app() != nil else { call.resolve(); return }
        Messaging.messaging().isAutoInitEnabled = false
        Messaging.messaging().deleteToken { error in
            if error != nil { call.reject("Notification cleanup could not finish") }
            else { call.resolve() }
        }
        #else
        call.resolve()
        #endif
    }
}
