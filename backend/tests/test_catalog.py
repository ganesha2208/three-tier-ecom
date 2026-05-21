"""Tests for the public catalog read endpoints."""


def test_list_products_is_empty_on_fresh_db(client):
    resp = client.get("/api/v1/products")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 0
    assert body["items"] == []


def test_list_categories_is_empty_on_fresh_db(client):
    resp = client.get("/api/v1/categories")
    assert resp.status_code == 200
    assert resp.json() == []
