"""store/web.py: el front compilado y la API en un solo servidor (lo que levanta `python demo.py`)."""

import pytest
from fastapi.testclient import TestClient

from store.api.app import create_app
from store.api.deps import get_container
from store.web import create_web_app

pytestmark = pytest.mark.integration

INDEX = "<!doctype html><title>Tienda</title>"


@pytest.fixture
def dist(tmp_path):
    folder = tmp_path / "dist"
    (folder / "assets").mkdir(parents=True)
    (folder / "index.html").write_text(INDEX, encoding="utf-8")
    (folder / "assets" / "app.js").write_text("console.log('front')", encoding="utf-8")
    (folder / "favicon.svg").write_text("<svg/>", encoding="utf-8")
    (tmp_path / "secret.txt").write_text("no", encoding="utf-8")
    return folder


@pytest.fixture
def web(dist, container):
    api = create_app()
    api.dependency_overrides[get_container] = lambda: container
    with TestClient(create_web_app(dist, api=api)) as client:
        yield client


def test_api_is_served_under_api_prefix(web):
    response = web.get("/api/products")

    assert response.status_code == 200
    assert [product["code"] for product in response.json()][:2] == [20, 30]


def test_api_errors_keep_their_json_format(web):
    response = web.get("/api/products/999")

    assert response.status_code == 404
    assert "detail" in response.json()


@pytest.mark.parametrize("path", ["/", "/productos", "/admin/reportes", "/pedidos/3"])
def test_front_routes_get_the_index_page(web, path):
    response = web.get(path)

    assert response.status_code == 200
    assert response.text == INDEX


def test_built_files_are_served(web):
    assert web.get("/assets/app.js").text == "console.log('front')"
    assert web.get("/favicon.svg").text == "<svg/>"


def test_files_outside_dist_are_not_served(web):
    response = web.get("/..%2fsecret.txt")

    assert response.text != "no"


def test_missing_build_explains_how_to_build_it(tmp_path, container):
    api = create_app()
    api.dependency_overrides[get_container] = lambda: container
    with TestClient(create_web_app(tmp_path / "no-dist", api=api)) as client:
        response = client.get("/")
        assert client.get("/api/products").status_code == 200

    assert response.status_code == 503
    assert "npm run build" in response.text
