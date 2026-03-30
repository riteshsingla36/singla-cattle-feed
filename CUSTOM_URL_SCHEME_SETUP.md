# Deep Linking with Redirect Page Setup

## Overview

The admin order link in WhatsApp now uses an **HTTPS URL** that points to a redirect page on your website. This page attempts to open your Flutter app using a custom URL scheme (`st://`). If the app is not installed, it falls back to the browser version after a countdown.

**Flow:**
1. User taps link in WhatsApp: `https://yourdomain.com/admin/orders-redirect?orderId=123`
2. Redirect page loads and immediately tries to open: `st://admin/orders?orderId=123`
3. If app opens → user sees order in app
4. If app doesn't open → after 5 seconds, redirects to browser version: `/admin/orders?orderId=123`
5. User can also manually click "Open in Browser Instead"

---

## Website Changes (Already Done)

✅ Created redirect page at `app/admin/orders-redirect/page.js`
✅ Updated `components/OrderDetailsModal.js` to use redirect URL instead of direct admin URL

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

**Note:** `android:launchMode="singleTask"` is recommended to handle deep links properly when app is already running.

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

Add deep link handling to your main app widget:

**main.dart Example:**

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

    // Check if it's an admin order link with st:// scheme
    if (uri.scheme == 'st' && uri.host == 'admin' && uri.pathSegments.isNotEmpty && uri.pathSegments[0] == 'orders') {
      final orderId = uri.queryParameters['orderId'];
      if (orderId != null) {
        // Navigate to admin order detail page
        // Example: Load URL in WebView or pass to route
        navigatorKey.currentState?.pushNamed('/admin/orders', arguments: {'orderId': orderId});

        // Or if using WebView directly:
        // webViewController.loadUrl('https://YOUR_DOMAIN/admin/orders?orderId=$orderId');
      } else {
        print('Order ID not found in query parameters');
      }
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
            // Your WebView or order detail UI here
            // Expanded(child: AdminWebView(orderId: orderId)),
          ],
        ),
      ),
    );
  }
}
```

---

### 5. WebView Handling (If Using WebView for Admin Panel)

If your app uses a WebView to display the admin panel (likely, since you're using the Next.js website), configure it to load the order page with the order ID:

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
        onNavigationRequest: (NavigationRequest request) {
          print('Navigation requested: ${request.url}');
          return NavigationDecision.navigate;
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

Replace `YOUR_DOMAIN` with your production domain (e.g., `singlatraders.com` or your Vercel URL).

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
1. Build and run on a device (simulator may not support custom scheme properly)
2. Open Safari and type the URL in the address bar: `st://admin/orders?orderId=test123`
3. iOS will prompt to open your app. Tap "Open"
4. Your app should handle the link and navigate accordingly

### Full Flow Test (WhatsApp)
1. Deploy the updated website with the redirect page
2. Open your Flutter app and log in (if needed)
3. On WhatsApp (from admin), open the order share message
4. Tap the "View in Admin Panel" link
5. Your Flutter app should open (or if already open, navigate to the order)

---

## Important Notes

- **WhatsApp compatibility:** Because WhatsApp strips custom scheme URLs (like `st://`) from messages, we use an HTTPS redirect page. The HTTPS link is clickable in WhatsApp.
- **Custom scheme (`st://`)** does not require HTTPS or verification files. Works immediately without server-side setup.
- **On iOS 14+**, tapping a custom scheme URL shows a confirmation dialog: "Open this page in 'App Name'?". This is expected.
- Android typically opens directly without a chooser if only one app handles the scheme.
- **No App Store/Play Store needed** — custom schemes work for sideloaded apps.
- Ensure your Flutter app properly handles:
  - **Cold start** (app not running): Use `getInitialUri()`
  - **Warm start** (app in background): Use `uriLinkStream`
  - **Foreground** (app already open): `uriLinkStream` also works

---

## Redirect Page Configuration

The redirect page (`/admin/orders-redirect`) is already created. You can customize:

- **Countdown duration:** Currently 5 seconds. Change `setCountingDown(5)` in `app/admin/orders-redirect/page.js`.
- **Fallback message:** Edit the text in that page to match your branding.
- **Styling:** Modify the Tailwind classes in the redirect page.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Android: Nothing happens | Check AndroidManifest.xml has correct intent-filter with `android:scheme="st"`. Ensure `android:launchMode="singleTask"` is set. |
| iOS: "Cannot Open Page" | Ensure URL Types is configured in Xcode Info tab. Check `CFBundleURLSchemes` includes `st`. |
| Deep link not detected on app start | Use `getInitialUri()` for cold start detection. Make sure you're calling it in `initState()` before any async operations. |
| WebView doesn't load order | Verify the `orderId` is correctly passed to your WebView URL. Check that you're using the correct domain (production vs localhost). |
| Redirect page doesn't work | Ensure the redirect page is deployed and accessible at `/admin/orders-redirect`. Check browser console for errors. |
| `getInitialUri()` returns null | On iOS, the first tap may show a confirmation dialog; after user accepts, the app launches and `getInitialUri()` should capture the link. Try multiple taps. |

---

## Summary

- **WhatsApp link:** HTTPS → redirect page
- **Redirect page:** Tries to open app via `st://` scheme, then fallback to browser
- **Flutter app:** Registers `st://` scheme and handles incoming URIs with orderId

No App Store or Play Store required. Works with sideloaded/distributed apps.
