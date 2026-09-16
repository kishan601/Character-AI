package com.aegis.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Force allow mixed content (HTTP requests from capacitor://localhost or http://localhost)
        // Without this, Android WebView blocks all LAN HTTP fetch() calls as "mixed content"
        // even when cleartext is permitted in network_security_config.xml
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
    }
}

