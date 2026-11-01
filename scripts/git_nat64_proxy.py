import socket
import threading
import sys

def forward(src, dst):
    try:
        while True:
            data = src.recv(32768)
            if not data:
                break
            dst.sendall(data)
    except Exception:
        pass
    finally:
        try:
            src.close()
        except Exception:
            pass
        try:
            dst.close()
        except Exception:
            pass

def handle_client(client_sock):
    try:
        req = b""
        while b"\r\n\r\n" not in req:
            chunk = client_sock.recv(4096)
            if not chunk:
                break
            req += chunk

        if not req:
            client_sock.close()
            return

        lines = req.split(b"\r\n")
        first_line = lines[0].decode("latin1", errors="ignore")
        parts = first_line.split()
        if len(parts) < 2:
            client_sock.close()
            return

        method = parts[0].upper()
        target = parts[1]

        if method == "CONNECT":
            host, port_str = target.split(":")
            port = int(port_str)
            ipv4 = socket.gethostbyname(host)
            remote = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
            remote.connect((f"64:ff9b::{ipv4}", port))
            client_sock.sendall(b"HTTP/1.1 200 Connection Established\r\n\r\n")
        else:
            client_sock.close()
            return

        t1 = threading.Thread(target=forward, args=(client_sock, remote), daemon=True)
        t2 = threading.Thread(target=forward, args=(remote, client_sock), daemon=True)
        t1.start()
        t2.start()
    except Exception as e:
        try:
            client_sock.close()
        except Exception:
            pass

def main():
    port = 8989
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("127.0.0.1", port))
    server.listen(100)
    print(f"Proxy running on 127.0.0.1:{port}", flush=True)
    while True:
        client, _ = server.accept()
        t = threading.Thread(target=handle_client, args=(client,), daemon=True)
        t.start()

if __name__ == "__main__":
    main()

