import numpy as np
from pyproj import CRS, Transformer

def radolan_gitter():

    raster = 900
    pixel = 1000.0

   # Offizieller Ursprung des RADOLAN-900x900-Gitters
    x0 = -523462.2
    y0 = -4658645.0

    x = x0 + np.arange(raster) * pixel
    y = y0 + (raster - 1 - np.arange(raster)) * pixel

    xx, yy = np.meshgrid(x, y)

    return xx, yy


def geo_info():

    xx, yy = radolan_gitter()

    print()
    print("===== RADOLAN GEO =====")
    print("Raster:", xx.shape)
    print("X-Min:", xx.min())
    print("X-Max:", xx.max())
    print("Y-Min:", yy.min())
    print("Y-Max:", yy.max())

    return True

def geo_test():

    print()
    print("===== NÄCHSTER SCHRITT =====")
    print("Koordinatengitter vorhanden.")
    print("Nächster Ausbau:")
    print("- stereographische Projektion")
    print("- Umrechnung in WGS84")
    print("- Deutschlandkarte")
    print()

    return True

def transformer_test():

    radolan = CRS.from_proj4(
        "+proj=stere +lat_0=90 +lat_ts=60 +lon_0=10 "
        "+a=6370040 +b=6370040 +units=m +no_defs"
    )

    wgs84 = CRS.from_epsg(4326)

    transformer = Transformer.from_crs(
        radolan,
        wgs84,
        always_xy=True
    )

    lon, lat = transformer.transform(0, 0)

    print()
    print("===== TRANSFORMER TEST =====")
    print(f"Breite : {lat:.6f}")
    print(f"Länge  : {lon:.6f}")

    return True

def radolan_wgs84():

    xx, yy = radolan_gitter()

    radolan = CRS.from_proj4(
        "+proj=stere +lat_0=90 +lat_ts=60 +lon_0=10 "
        "+a=6370040 +b=6370040 +units=m +no_defs"
    )

    wgs84 = CRS.from_epsg(4326)

    transformer = Transformer.from_crs(
        radolan,
        wgs84,
        always_xy=True
    )

    lon, lat = transformer.transform(xx, yy)

    print()
    print("===== WGS84 TEST =====")
    print("Arraygröße:", lat.shape)

    print()
    print("Ecken:")
    print(f"Oben links : {lat[0,0]:.4f} / {lon[0,0]:.4f}")
    print(f"Oben rechts: {lat[0,-1]:.4f} / {lon[0,-1]:.4f}")
    print(f"Unten links: {lat[-1,0]:.4f} / {lon[-1,0]:.4f}")
    print(f"Unten rechts: {lat[-1,-1]:.4f} / {lon[-1,-1]:.4f}")

    return lat, lon