import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

// Pastikan fail ini ada di folder public (jika guna local)
// Atau guna URL ini jika internet pejabat OK
const geoUrl = "https://raw.githubusercontent.com/jnewbery/CartogramMalaysia/master/public/data/malaysia-states.topojson";
// const geoUrl = "/malaysia.json"; // Guna ini jika simpan file local

const DashboardMap = ({ data }) => {
    return (
        <div className="rounded-xl overflow-hidden border shadow-md bg-slate-50 w-full h-[400px] flex items-center justify-center relative">

            <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                    scale: 3000,
                    center: [109.5, 3.8]
                }}
                style={{ width: "100%", height: "100%" }}
            >
                <Geographies geography={geoUrl}>
                    {({ geographies }) =>
                        geographies.map((geo) => (
                            <Geography
                                key={geo.rsmKey}
                                geography={geo}
                                style={{
                                    default: {
                                        fill: "#D6D6DA",
                                        stroke: "#FFFFFF",
                                        strokeWidth: 0.5,
                                        outline: "none",
                                    },
                                    hover: {
                                        fill: "#94a3b8",
                                        outline: "none",
                                    },
                                    pressed: {
                                        fill: "#64748b",
                                        outline: "none",
                                    },
                                }}
                            />
                        ))
                    }
                </Geographies>

                {/* --- MARKER BERANIMASI --- */}
                {data.map((item, index) => (
                    item.location?.lat && item.location?.lng && (
                        <Marker
                            key={index}
                            coordinates={[item.location.lng, item.location.lat]}
                        >
                            <g transform="translate(-12, -24)">
                                {/* ANIMASI PULSE (Bulatan besar pudar) */}
                                <circle cx="12" cy="10" r="8" fill="#FF5533" opacity="0.5">
                                    <animate attributeName="r" from="8" to="20" dur="1.5s" begin="0s" repeatCount="indefinite" />
                                    <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" begin="0s" repeatCount="indefinite" />
                                </circle>

                                {/* PIN UTAMA */}
                                <circle cx="12" cy="10" r="4" fill="#FF5533" stroke="#FFF" strokeWidth="1" />

                                {/* Bentuk Pin (Optional - Boleh buang jika nak bulatan sahaja) */}
                                <path
                                    d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"
                                    fill="none"
                                    stroke="#FF5533"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </g>

                            <text
                                textAnchor="middle"
                                y={-30}
                                style={{ fontFamily: "system-ui", fill: "#5D5A6D", fontSize: "10px", fontWeight: "bold" }}
                            >
                                {item.name}
                            </text>
                        </Marker>
                    )
                ))}
            </ComposableMap>

            {/* Legend */}
            <div className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-lg shadow-sm text-xs text-slate-600">
                <p className="font-bold mb-1">Status Projek</p>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#FF5533]"></span> Lokasi Aktif</div>
            </div>
        </div>
    );
};

export default DashboardMap;