# Access Vigor Router's CLI by telnet

Source: https://www.draytek.com/support/knowledge-base/4923 (DrayTek Knowledge Base, System)

Vigor router provides not only the graphic user interface (WUI) but also the command-line interface (CLI). Network Administrators can telnet/SSH into Vigor router, and use commands to configure the router. The CLI is helpful when you need to set up routers in bulk, or writing scripts to make the configuring become an automatic process.

**Note:** By default, Vigor Router disables telnet server from the WAN interface and enables it from LAN interface. Network administrator can enable/disable it on WebUI.

## Steps

1. Open Command Prompt (Windows) / Terminal (macOS/Linux).
2. `telnet 192.168.1.1` (replace with the router's LAN IP if not default).
3. Enter the administrator account and password. Default: username `admin`, password `admin`.
4. Enter command lines to configure the router. Type `?` to list the available commands.
5. Enter `quit` (or logout) to exit.