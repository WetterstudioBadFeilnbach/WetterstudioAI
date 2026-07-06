function initSearch(map, geojsonLayer, suche, suchErgebnisse) {

    const layerListe = [];

    geojsonLayer.eachLayer(layer => {

        const landkreis =
            layer.feature.properties.NAME_3 ||
            layer.feature.properties.NAME ||
            "";

        layerListe.push({
            name: landkreis,
            layer: layer
        });

    });

    suche.addEventListener("input", function () {

        const text = this.value.toLowerCase().trim();

        suchErgebnisse.innerHTML = "";

        if (text.length < 2) {

            suchErgebnisse.style.display = "none";
            return;

        }

        const treffer = layerListe
            .filter(l => l.name.toLowerCase().includes(text))
            .sort((a, b) => {

                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();

                if (aName === text && bName !== text) return -1;
                if (bName === text && aName !== text) return 1;

                const aStarts = aName.startsWith(text);
                const bStarts = bName.startsWith(text);

                if (aStarts && !bStarts) return -1;
                if (bStarts && !aStarts) return 1;

                return aName.localeCompare(bName, "de");

            });

        if (treffer.length === 0) {

            suchErgebnisse.style.display = "none";
            return;

        }

        suchErgebnisse.style.display = "block";

        treffer.forEach((eintrag) => {

            const div = document.createElement("div");

            div.className = "suchTreffer";
            div.textContent = eintrag.name;

            div.onclick = function () {

                map.flyToBounds(eintrag.layer.getBounds(), {
                    padding: [40, 40],
                    duration: 1.2
                });

                eintrag.layer.fire("click");

                suche.value = eintrag.name;
                suchErgebnisse.style.display = "none";

            };

            suchErgebnisse.appendChild(div);

        });

    });

    document.addEventListener("click", function (e) {

        if (!suche.contains(e.target) &&
            !suchErgebnisse.contains(e.target)) {

            suchErgebnisse.style.display = "none";

        }

    });

    document.addEventListener("keydown", function (e) {

        if (e.key === "Escape") {

            suchErgebnisse.style.display = "none";
            suche.blur();

        }

    });

}