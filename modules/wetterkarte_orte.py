WETTERKARTE_ORTE = [

    {"name": "Aschaffenburg", "longitude": 9.1521, "latitude": 49.9750},
    {"name": "Schweinfurt", "longitude": 10.1860, "latitude": 50.0490},
    {"name": "Coburg", "longitude": 10.9627, "latitude": 50.2597},
    {"name": "Hof", "longitude": 11.9148, "latitude": 50.3167},

    {"name": "Bayreuth", "longitude": 11.5783, "latitude": 49.9481},
    {"name": "Bamberg", "longitude": 10.8978, "latitude": 49.8917},

    {"name": "Nürnberg", "longitude": 11.0767, "latitude": 49.4521},
    {"name": "Ansbach", "longitude": 10.5719, "latitude": 49.3009},
    {"name": "Amberg", "longitude": 11.8627, "latitude": 49.4414},

    {"name": "Regensburg", "longitude": 12.0956, "latitude": 49.0134},
    {"name": "Straubing", "longitude": 12.5742, "latitude": 48.8813},

    {"name": "Ingolstadt", "longitude": 11.4257, "latitude": 48.7665},
    {"name": "Augsburg", "longitude": 10.8985, "latitude": 48.3705},

    {"name": "München", "longitude": 11.5820, "latitude": 48.1351},
    {"name": "Landshut", "longitude": 12.1618, "latitude": 48.5442},
    {"name": "Altötting", "longitude": 12.6780, "latitude": 48.2253},

    {"name": "Passau", "longitude": 13.4319, "latitude": 48.5667},

    {"name": "Rosenheim", "longitude": 12.1280, "latitude": 47.8564},
    {"name": "Berchtesgaden", "longitude": 13.0000, "latitude": 47.6315},

    {"name": "Kempten", "longitude": 10.3139, "latitude": 47.7267},
    {
        "name": "Garmisch-Partenkirchen",
        "longitude": 11.0955,
        "latitude": 47.4917
    },

]


def zeige_wetterkarte_orte():

    print()
    print(
        "===== WETTERKARTE BAYERN ORTE ====="
    )

    for ort in WETTERKARTE_ORTE:

        print(
            ort["name"],
            "|",
            ort["longitude"],
            ",",
            ort["latitude"]
        )

    print()
    print(
        "Anzahl Orte:",
        len(WETTERKARTE_ORTE)
    )