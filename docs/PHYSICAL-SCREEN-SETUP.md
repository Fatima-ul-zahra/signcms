# Connecting a physical advertising screen

1. Connect the Windows Mini PC to the display using HDMI.
2. Connect the Mini PC to the same network as the CMS server (or to the internet if the server is hosted).
3. Install the SignCMS Player Windows installer.
4. Open the player and enter the reachable CMS API URL.
5. In the CMS website, choose **Screens → Pair screen** and generate a code.
6. Enter the code in the player.
7. Upload media, create a playlist, and assign it to the paired screen.
8. Confirm playback and heartbeat status.

For a remote Mini PC, `localhost` is not the correct server address. Use the server's LAN IP address during local testing or its HTTPS domain when hosted.

Windows startup: use Windows Settings → Apps → Startup, or place a shortcut to SignCMS Player in the user's Startup folder after installation. Test kiosk behavior and Windows update/restart behavior on one Mini PC before rolling out to all screens.
