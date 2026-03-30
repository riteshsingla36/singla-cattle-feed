# Custom URL Scheme Setup for Flutter App

## Overview
The admin order link in WhatsApp now uses a custom URL scheme `st://`. When clicked, it will open your Flutter app directly with the order ID passed as a parameter.

**Example link generated:** `st://admin/orders?orderId=abc123def456`

---

## Website Changes (Already Done)

✅ Modified `components/OrderDetailsModal.js` to generate the custom scheme URL instead of HTTP URL.

---

## Flutter App Configuration

### 1. Add `uni_links` Package

In `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  uni_links: ^0.5.1
```

Run:
```bash
flutter pub get
```

### 2. Android Setup

**A. Define URL Scheme in `AndroidManifest.xml`**

Open `android/app/src/main/AndroidManifest.xml` and add an `<intent-filter>` inside the main `<activity>` tag (the one with `android:name=".MainActivity"`):

```xml
<activity
    android:name=".MainActivity"
    android:exported="true"
    android:launchMode="singleTask"
    android:theme="@style/LaunchTheme"
    ...>

    <!-- Existing intent-filter for MAIN/LAUNCHER -->
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>

    <!-- Custom URL Scheme: st:// -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="st" />
    </intent-filter>

</activity>
```

This registers `st://` as a custom scheme that opens your app.

---

### 3. iOS Setup

**A. Register URL Scheme in Xcode**

1. Open `ios/Runner.xcworkspace` in Xcode
2. Select the `Runner` project in the Project Navigator
3. Select the `Runner` target
4. Go to the **Info** tab
5. Expand **URL Types** (or click the + button to add a new one if not present)
6. Click the **+** to add a URL Type
7. Fill in:
   - **Identifier:** `Runner` (or any unique string)
   - **URL Schemes:** `st` (just the scheme, no `://`)
8. Save

**Alternative via Info.plist:**

You can also edit `ios/Runner/Info.plist` directly and add:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleTypeRole</key>
        <string>Editor</string>
        <key>CFBundleURLName</key>
        <string>st</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>st</string>
        </array>
    </dict>
</array>
```

---

### 4. Handle Incoming Links in Flutter

**Main.dart Example:**

```dart
import 'package:flutter/material.dart';
import 'package:uni_links/uni_links.dart';
import 'dart:async';

void main() {
  runApp(MyApp());
}

class MyApp extends StatefulWidget {
  @override
  _MyAppState createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  Stream? _sub;
  final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  @override
  void initState() {
    super.initState();
    _initDeepLink();
  }

  void _initDeepLink() async {
    // Handle deep link when app is already in foreground
    _sub = uriLinkStream.listen((Uri? uri) {
      if (uri != null) {
        _handleDeepLink(uri);
      }
    }, onError: (Object err) {
      print('Failed to listen: $err');
    });

    // Check if app was launched from a deep link (cold start)
    try {
      final initialUri = await getInitialUri();
      if (initialUri != null) {
        _handleDeepLink(initialUri);
      }
    } on FormatException {
      print('Bad initial URI: $initialUri');
    }
  }

  void _handleDeepLink(Uri uri) {
    print('Deep link received: $uri');

    // Check if it's an admin order link
    if (uri.host == 'admin' && uri.pathSegments.isNotEmpty && uri.pathSegments[0] == 'orders') {
      final orderId = uri.queryParameters['orderId'];
      if (orderId != null) {
        // Navigate to admin order detail page in your WebView
        // Assuming you use a WebView to display the admin panel:
        //
        // Example 1: If you push a new route
        // navigatorKey.currentState?.push(
        //   MaterialPageRoute(
        //     builder: (context) => AdminOrderPage(orderId: orderId),
        //   ),
        // );

        // Example 2: Load URL in existing WebView
        // webViewController.loadUrl('https://YOUR_DOMAIN/admin/orders?orderId=$orderId');

        // Example 3: Use a global key to navigate
        navigatorKey.currentState?.pushNamed('/admin/orders', arguments: {'orderId': orderId});
      } else {
        print('Order ID not found in query parameters');
      }
    } else if (uri.scheme == 'st' && uri.path.isNotEmpty) {
      // Handle other routes with st:// scheme
      print('Unknown st path: ${uri.path}');
    }
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey,
      title: 'Singla Traders',
      theme: ThemeData(primarySwatch: Colors.green),
      home: HomePage(),
      routes: {
        '/admin/orders': (context) => AdminOrderPage(),
        // Add other routes as needed
      },
    );
  }
}

class HomePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Home')),
      body: Center(child: Text('Home Page')),
    );
  }
}

class AdminOrderPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    // Retrieve orderId from route arguments
    final args = ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>?;
    final orderId = args?['orderId'] ?? 'No order ID';

    return Scaffold(
      appBar: AppBar(title: Text('Admin Order')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Admin Order Page'),
            SizedBox(height: 16),
            Text('Order ID: $orderId'),
            SizedBox(height: 16),
            // Load admin order WebView with the orderId
            // Expanded(child: AdminWebView(orderId: orderId)),
          ],
        ),
      ),
    );
  }
}
```

---

### 5. WebView Handling

If your app uses a WebView to display the admin panel (which it likely does, since you're using this Next.js website), you'll need to:

- Register a **JavaScript bridge** or **navigation delegate** in the WebView to intercept the admin orders URL when it's loaded within the app.
- Or, directly construct the WebView URL with the order ID.

**Example with `webview_flutter`:**

```dart
import 'package:webview_flutter/webview_flutter.dart';

class AdminWebView extends StatefulWidget {
  final String orderId;

  AdminWebView({required this.orderId});

  @override
  _AdminWebViewState createState() => _AdminWebViewState();
}

class _AdminWebViewState extends State<AdminWebView> {
  late final WebViewController controller;

  @override
  void initState() {
    super.initState();
    controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(NavigationDelegate(
        onPageStarted: (String url) {
          print('Page started loading: $url');
        },
      ))
      ..loadRequest(Uri.parse('https://YOUR_DOMAIN/admin/orders?orderId=${widget.orderId}'));
  }

  @override
  Widget build(BuildContext context) {
    return WebView(controller: controller);
  }
}
```

---

## Testing

### Android
1. Build and install the app on a device (or emulator)
2. Open Terminal and run:
   ```bash
   adb shell am start -W -a android.intent.ACTION_VIEW -d "st://admin/orders?orderId=test123"
   ```
3. Your app should open and detect the deep link

### iOS
1. Build and run on a simulator or device
2. Open Safari and type the URL in the address bar: `st://admin/orders?orderId=test123`
3. iOS will prompt to open your app. Tap "Open"
4. Your app should handle the link and navigate accordingly

### WhatsApp Test
1. Send yourself a WhatsApp message containing the admin order link (generated by the website)
2. Tap the link
3. Your app should open directly (no chooser dialog needed)

---

## Important Notes

- **Custom scheme URLs (`st://`)** do not require HTTPS or verification files. They work immediately without server-side setup.
- **On iOS 14+**, when a user taps a custom scheme URL, they may see a confirmation dialog: "Open this page in 'App Name'?". This is expected behavior and cannot be bypassed.
- Android typically opens directly without a chooser if only one app handles the scheme.
- **No App Store/Play Store needed** — custom schemes work for sideloaded apps.
- Ensure your Flutter app properly handles cases where the app is:
  - **Not running** (cold start) → `getInitialUri()` captures the link
  - **In background** → `uriLinkStream` captures the link
  - **In foreground** → `uriLinkStream` captures the link

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Android: Nothing happens | Check AndroidManifest.xml has correct intent-filter; `android:launchMode="singleTask"` is recommended |
| iOS: "Cannot Open Page" | Ensure URL Types is configured in Xcode Info tab; Check `CFBundleURLSchemes` contains `st` |
| Deep link not detected on app start | Use `getInitialUri()` for cold start, `uriLinkStream` for warm start |
| WebView doesn't navigate | Pass the orderId properly to your WebView loading logic |
| `getInitialUri()` returns null on cold start | On iOS, the first run may require user interaction; try tapping the link again |

---

## Alternative: `app_links` Package

If `uni_links` doesn't work well for your use case, try `app_links`:

```yaml
dependencies:
  app_links: ^3.5.0
```

API is similar but handles some edge cases differently.

---

## Next Steps

After configuring the Flutter app:
1. Deploy the updated website (the code is already using `st://`)
2. Install the updated Flutter app on your device
3. Test the deep link flow from WhatsApp

See `CUSTOM_URL_SCHEME_SETUP.md` for complete setup.
