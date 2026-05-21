"""Tests for the authentication flow: register, login, and the /me endpoint."""

AUTH = "/api/v1/auth"


def _register(client, email="user@example.com", password="testpass123"):
    return client.post(
        f"{AUTH}/register",
        json={"email": email, "password": password, "full_name": "Test User"},
    )


def test_register_returns_token_pair(client):
    resp = _register(client)
    assert resp.status_code == 201
    body = resp.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["token_type"] == "bearer"


def test_register_rejects_duplicate_email(client):
    _register(client, email="dup@example.com")
    resp = _register(client, email="dup@example.com")
    assert resp.status_code == 409


def test_register_rejects_short_password(client):
    resp = client.post(
        f"{AUTH}/register",
        json={"email": "x@example.com", "password": "short", "full_name": "X"},
    )
    assert resp.status_code == 422


def test_login_json_succeeds_with_correct_password(client):
    _register(client, email="login@example.com", password="testpass123")
    resp = client.post(
        f"{AUTH}/login-json",
        json={"email": "login@example.com", "password": "testpass123"},
    )
    assert resp.status_code == 200
    assert resp.json()["access_token"]


def test_login_json_rejects_wrong_password(client):
    _register(client, email="login2@example.com", password="testpass123")
    resp = client.post(
        f"{AUTH}/login-json",
        json={"email": "login2@example.com", "password": "wrongpass123"},
    )
    assert resp.status_code == 401


def test_me_requires_authentication(client):
    resp = client.get(f"{AUTH}/me")
    assert resp.status_code == 401


def test_me_returns_current_user_with_token(client):
    token = _register(client, email="me@example.com").json()["access_token"]
    resp = client.get(f"{AUTH}/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "me@example.com"
