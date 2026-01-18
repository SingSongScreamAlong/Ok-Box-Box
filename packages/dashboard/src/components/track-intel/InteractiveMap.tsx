import React, { useState, useRef } from 'react';

interface InteractiveMapProps {
    trackId: string;
    onTurnSelect: (turnId: string) => void;
    selectedTurn: string | null;
}

interface PlacedMarker {
    id: number;
    cx: number;
    cy: number;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({ trackId, onTurnSelect, selectedTurn }) => {
    const [placementMode, setPlacementMode] = useState(false);
    const [placedMarkers, setPlacedMarkers] = useState<PlacedMarker[]>([]);
    const svgRef = useRef<SVGSVGElement>(null);

    const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!placementMode || !svgRef.current) return;

        // Get SVG coordinates from click
        const svg = svgRef.current;
        const point = svg.createSVGPoint();
        point.x = e.clientX;
        point.y = e.clientY;
        const svgPoint = point.matrixTransform(svg.getScreenCTM()?.inverse());

        const cx = Math.round(svgPoint.x);
        const cy = Math.round(svgPoint.y);

        // Add marker
        const newMarker: PlacedMarker = { id: placedMarkers.length + 1, cx, cy };
        setPlacedMarkers([...placedMarkers, newMarker]);

        // Log to console for easy copying
        console.log(`T${newMarker.id}: { cx: ${cx}, cy: ${cy} }`);
    };

    const clearMarkers = () => setPlacedMarkers([]);
    const exportMarkers = () => {
        const code = placedMarkers.map(m => `{ id: '${m.id}', cx: ${m.cx}, cy: ${m.cy}, name: 'T${m.id}' },`).join('\n');
        console.log('--- COPY THIS ---\n' + code + '\n-----------------');
        navigator.clipboard.writeText(code);
    };

    return (
        <div className="w-full h-full flex items-center justify-center bg-gray-950 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-950/50 to-gray-950 pointer-events-none" />

            {/* Grid Overlay */}
            <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            </div>

            {/* Placement Mode Controls */}
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                <button
                    onClick={() => setPlacementMode(!placementMode)}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${placementMode
                        ? 'bg-green-600 text-white ring-2 ring-green-400'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                >
                    {placementMode ? '🎯 PLACEMENT ON' : 'Enable Placement'}
                </button>
                {placementMode && (
                    <>
                        <div className="bg-gray-800 px-3 py-2 rounded-lg text-sm text-white">
                            Markers: {placedMarkers.length}/14
                        </div>
                        <button
                            onClick={clearMarkers}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-500"
                        >
                            Clear All
                        </button>
                        <button
                            onClick={exportMarkers}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-500"
                        >
                            Export to Console
                        </button>
                    </>
                )}
            </div>

            {/* Coordinate Display */}
            {placementMode && placedMarkers.length > 0 && (
                <div className="absolute bottom-4 left-4 z-20 bg-gray-900 p-3 rounded-lg max-h-60 overflow-y-auto text-xs font-mono text-green-400">
                    {placedMarkers.map(m => (
                        <div key={m.id}>T{m.id}: ({m.cx}, {m.cy})</div>
                    ))}
                </div>
            )}

            {/* 
                ViewBox: The track path coordinates go from roughly X:580-1840, Y:970-1600.
                We use translate and scale to flip the track horizontally around its center.
                The center of the viewBox (500, 900, 1400, 800) is approximately (1200, 1300).
                To flip around the center: translate(2 * centerX, 0) then scale(-1, 1), i.e., translate(2400, 0) scale(-1, 1)
            */}
            <svg
                ref={svgRef}
                viewBox="500 900 1400 800"
                className={`w-full h-full max-w-4xl max-h-3xl relative z-10 p-8 ${placementMode ? 'cursor-crosshair' : ''}`}
                onClick={handleSvgClick}
            >
                <defs>
                    <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <linearGradient id="track-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="50%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                </defs>

                {/* Track Implementation for Daytona */}
                {trackId === 'daytona' ? (
                    // No transform - showing raw SVG orientation
                    <g fill="none">
                        <path d="M 1574.378,978.28591 C 1572.6174,978.26231 1570.8473,978.26191 1569.096,978.25113 C 1511.0339,977.89379 1267.3568,980.96902 1158.5504,978.98088 C 1139.1474,978.62192 1126.5059,980.7113 1117.345,984.35484 C 1108.1842,987.99838 1102.7406,993.3072 1098.4451,997.99281 C 1094.1496,1002.6782 1090.9607,1006.5351 1085.224,1009.4869 C 1079.4873,1012.4389 1070.8277,1014.66 1055.56,1014.5793 C 1034.9159,1014.464 1024.6124,1011.8969 1018.0077,1008.57 C 1011.4028,1005.2431 1007.7782,1000.6049 1000.6067,995.29884 C 993.43519,989.99294 983.14983,984.80382 964.34311,981.28739 C 945.5364,977.77096 918.02824,975.74231 875.34189,976.40164 C 855.52847,976.70766 835.45623,976.97408 815.47569,979.16457 C 797.72182,981.11092 779.0488,983.02155 761.50216,988.97916 C 738.86179,996.66655 716.81473,1007.5019 696.33104,1019.6213 C 680.22716,1029.1494 663.61621,1040.2224 650.84103,1054.6186 C 634.59212,1072.929 620.70122,1094.6228 610.13147,1116.6777 C 600.58116,1136.6053 594.57404,1158.6764 590.67482,1180.1605 C 587.05428,1200.1093 585.41772,1221.287 587.45942,1241.6318 C 589.5789,1262.7516 595.80309,1283.7652 602.99227,1303.403 C 609.56551,1321.3583 617.99283,1339.4918 629.11141,1355.3351 C 640.58368,1371.6824 654.22883,1388.2729 671.03341,1400.1496 C 698.68661,1419.6941 729.91803,1435.3101 761.03277,1448.7915 C 871.64816,1496.7183 983.59497,1551.6708 1100.2109,1584.3031 C 1140.8906,1595.6862 1170.0798,1601.8316 1211.8896,1598.8684 C 1226.9715,1597.7995 1246.2766,1598.5995 1262.3318,1596.7201 C 1284.6814,1594.1042 1307.0157,1589.2811 1328.6202,1583.1103 C 1356.1745,1575.2399 1382.4278,1563.9834 1408.9553,1554.9003 C 1421.5399,1550.5914 1446.6015,1539.6335 1469.3884,1522.4237 C 1492.1751,1505.2138 1512.9784,1481.4861 1514.5633,1451.5643 C 1515.1571,1440.3564 1509.2839,1430.7952 1500.7749,1423.4393 C 1492.2658,1416.0834 1480.9985,1410.4303 1469.1294,1405.9141 C 1445.3913,1396.8818 1419.2865,1392.5134 1407.932,1391.452 C 1395.3395,1390.2751 1386.57,1384.8859 1376.475,1379.0267 C 1366.3799,1373.1676 1354.9375,1366.9358 1338.6784,1366.3533 C 1294.6031,1364.7898 1249.8537,1368.0835 1217.7318,1365.254 C 1201.6709,1363.8391 1188.8827,1360.7528 1181.2354,1355.6755 C 1173.5879,1350.5984 1170.2926,1344.3397 1171.8581,1332.5343 C 1172.327,1328.999 1174.7423,1325.777 1180.355,1322.4881 C 1185.9679,1319.1992 1194.4897,1316.3207 1205.1925,1314.0587 C 1226.5985,1309.5346 1256.6588,1307.3591 1290.8375,1306.5778 C 1359.1945,1305.0155 1444.1552,1308.8102 1512.6701,1308.4447 C 1518.4269,1308.4091 1523.1127,1305.2153 1529.6441,1300.7304 C 1536.1756,1296.2455 1543.9481,1290.068 1552.6813,1282.7856 C 1570.148,1268.2208 1591.3965,1249.286 1613.0426,1231.4266 C 1634.6888,1213.5672 1656.791,1196.7624 1675.4006,1186.6494 C 1684.7054,1181.593 1693.1243,1178.2452 1699.8898,1177.1174 C 1706.6552,1175.9898 1711.3465,1176.9228 1714.8283,1179.8255 C 1721.9828,1185.7898 1724.6433,1191.7305 1724.7181,1198.6029 C 1724.7927,1205.4754 1721.8636,1213.6117 1716.2569,1222.5917 C 1705.0432,1240.5514 1683.4583,1261.3193 1659.4103,1282.3824 C 1635.3621,1303.4455 1608.8849,1324.9281 1587.6718,1345.2493 C 1566.4589,1365.5704 1550.0727,1384.3517 1547.3864,1402.7235 C 1545.275,1417.1653 1552.0014,1429.0278 1562.8135,1436.734 C 1573.6258,1444.4403 1588.3344,1448.8646 1604.1297,1451.2123 C 1635.7205,1455.9079 1671.3342,1452.5232 1689.7144,1443.6363 C 1708.8779,1434.3704 1728.6131,1424.4106 1745.7128,1410.9892 C 1763.6657,1396.8979 1779.5601,1379.5641 1793.6686,1362.0165 C 1802.6421,1350.8555 1808.5781,1337.7731 1814.374,1325.5719 C 1821.7718,1309.9986 1829.5015,1293.841 1834.2551,1276.76 C 1838.357,1262.0208 1840.0256,1246.476 1840.5161,1231.4301 C 1841.136,1212.4229 1841.1931,1192.5839 1837.6443,1173.4681 C 1834.3158,1155.5385 1827.6721,1137.9982 1820.0859,1121.7132 C 1811.8462,1104.025 1802.1068,1086.1335 1789.757,1070.6475 C 1777.6763,1055.4992 1763.1256,1041.2506 1747.0099,1030.1892 C 1726.9412,1016.4144 1704.465,1004.6326 1681.5026,996.30402 C 1658.8952,988.10427 1634.7269,984.70938 1611.6042,981.00499 C 1599.2161,979.02036 1586.7024,978.45116 1574.378,978.28591 z M 1579.4144,988.41146 C 1589.7735,988.66203 1600.0504,989.27848 1610.0197,990.87561 C 1633.266,994.59978 1656.8427,997.97695 1678.1168,1005.6932 C 1700.1965,1013.7016 1721.9781,1025.119 1741.3703,1038.4294 C 1756.4911,1048.808 1770.4018,1062.4208 1781.9464,1076.8969 C 1793.5525,1091.4502 1802.9908,1108.6463 1811.0431,1125.9318 C 1818.407,1141.7397 1824.7094,1158.5591 1827.8158,1175.2921 C 1831.1327,1193.1588 1831.1336,1212.3332 1830.5206,1231.1244 C 1830.047,1245.6476 1828.4009,1260.4242 1824.5985,1274.0868 C 1820.1597,1290.0367 1812.7489,1305.7141 1805.3506,1321.2887 C 1799.5148,1333.5735 1793.7942,1345.9205 1785.881,1355.7626 C 1772.0582,1372.9551 1756.6306,1389.7187 1739.5587,1403.1183 C 1723.5175,1415.709 1704.4186,1425.4113 1685.37,1434.6216 C 1670.9896,1441.5747 1635.2692,1445.7501 1605.5891,1441.3387 C 1590.7492,1439.1329 1577.332,1434.8098 1568.6071,1428.5913 C 1559.8822,1422.3728 1555.66,1415.1271 1557.2601,1404.183 C 1559.1803,1391.05 1573.844,1372.3272 1594.5924,1352.451 C 1615.3409,1332.5749 1641.7294,1311.1588 1665.9789,1289.9195 C 1690.2281,1268.6801 1712.3548,1247.7543 1724.7554,1227.8937 C 1730.9556,1217.9635 1734.8293,1208.1535 1734.7243,1198.4713 C 1734.619,1188.7893 1730.1258,1179.5465 1721.2361,1172.1353 C 1715.0388,1166.969 1706.7874,1165.8398 1698.2541,1167.2623 C 1689.7207,1168.6846 1680.4907,1172.5061 1670.6127,1177.8741 C 1650.8566,1188.61 1628.5388,1205.6868 1606.6974,1223.7075 C 1584.8557,1241.7281 1563.5304,1260.7057 1546.2728,1275.0962 C 1537.644,1282.2914 1530.0353,1288.3521 1523.9991,1292.4968 C 1517.9627,1296.6418 1512.882,1298.4386 1512.6011,1298.4401 C 1444.5,1298.8038 1359.5247,1295.0256 1290.6114,1296.6006 C 1256.1547,1297.3882 1225.7337,1299.4755 1203.118,1304.2553 C 1191.81,1306.6451 1182.4298,1309.6738 1175.2822,1313.8621 C 1168.1346,1318.0504 1162.9257,1323.8686 1161.9495,1331.2303 C 1160.02,1345.7781 1165.5034,1357.2308 1175.7183,1364.0126 C 1185.9334,1370.7943 1200.0773,1373.7257 1216.8645,1375.2045 C 1249.2928,1378.0613 1324.8053,1376.0963 1333.4529,1377.2663 C 1350.7599,1379.6079 1366.431,1388.2186 1383.6987,1399.4586 C 1388.713,1402.7224 1397.5573,1405.0706 1408.3244,1407.4351 C 1419.0916,1409.7996 1431.7308,1412.1229 1444.1191,1415.0271 C 1456.5072,1417.9311 1468.6378,1421.4269 1478.2969,1426.112 C 1487.9562,1430.7969 1495.0898,1436.6409 1497.7707,1444.1223 C 1500.5084,1451.7618 1499.0901,1459.9573 1495.2795,1468.1313 C 1491.4691,1476.3053 1485.2546,1484.396 1478.548,1491.5749 C 1465.1346,1505.9329 1449.843,1516.6839 1447.9898,1517.9955 C 1433.3708,1528.3417 1419.3509,1535.537 1408.9467,1535.9883 C 1277.0762,1541.7077 1150.6204,1532.2616 1017.5727,1531.1829 C 1010.1447,1531.1227 1002.5752,1531.0631 995.6828,1528.962 C 954.07197,1516.2786 912.37729,1502.6083 871.67179,1486.8072 C 835.33209,1472.7007 800.4564,1454.9948 765.00673,1439.6354 C 734.23956,1426.3048 703.63088,1410.9511 676.827,1392.007 C 661.54039,1381.2029 648.4336,1365.4812 637.28475,1349.5948 C 626.86582,1334.7484 618.76154,1317.3761 612.39098,1299.9744 C 605.35599,1280.7579 599.41426,1260.4912 597.42363,1240.6552 C 595.5036,1221.523 597.01913,1201.1638 600.50964,1181.9317 C 604.29967,1161.0491 610.1417,1139.7976 619.15416,1120.9923 C 629.35121,1099.7151 642.7837,1078.763 658.30638,1061.2709 C 669.9047,1048.2011 685.64722,1037.5391 701.40466,1028.2161 C 721.42288,1016.3721 742.93439,1005.8712 764.74101,998.46707 C 780.84307,992.99984 798.7597,991.08102 816.54601,989.13106 C 835.88938,987.01043 855.67904,986.71478 875.5047,986.40857 C 917.80718,985.75516 944.7653,987.80291 962.50956,991.12069 C 980.25382,994.43847 988.57468,998.84233 994.65916,1003.3441 C 1000.7437,1007.8457 1005.0088,1013.2134 1013.5079,1017.4943 C 1022.007,1021.7755 1034.0538,1024.4638 1055.5042,1024.5809 C 1071.7538,1024.6695 1082.1907,1022.2922 1089.7902,1018.382 C 1097.3895,1014.4717 1101.7533,1009.1667 1105.8144,1004.7365 C 1109.8757,1000.3066 1113.6085,996.58499 1121.0266,993.63466 C 1128.4445,990.68433 1139.7699,988.63941 1158.3694,988.97988 C 1267.6355,990.98005 1511.505,987.89864 1569.0402,988.25274 C 1572.5051,988.27406 1575.9613,988.32793 1579.4144,988.41146 z"
                            stroke="url(#track-gradient)"
                            strokeWidth="10"
                            filter="url(#neon-glow)"
                            className="drop-shadow-2xl"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />

                        {/* Turn Markers - Daytona Road Course (12 Turns) */}
                        {/* User-placed coordinates via interactive placement tool */}
                        {[
                            { id: '1', cx: 1478, cy: 1449, name: 'T1' },
                            { id: '2', cx: 1351, cy: 1392, name: 'T2' },
                            { id: '3', cx: 1138, cy: 1314, name: 'T3' },
                            { id: '4', cx: 1506, cy: 1279, name: 'T4' },
                            { id: '5', cx: 1705, cy: 1193, name: 'T5' },
                            { id: '6', cx: 1577, cy: 1412, name: 'T6' },
                            { id: '7', cx: 1816, cy: 1242, name: 'T7' },
                            { id: '8', cx: 1136, cy: 963, name: 'T8' },
                            { id: '9', cx: 1118, cy: 1015, name: 'T9' },
                            { id: '10', cx: 996, cy: 1025, name: 'T10' },
                            { id: '11', cx: 971, cy: 956, name: 'T11' },
                            { id: '12', cx: 643, cy: 1168, name: 'T12' },
                        ].map((turn) => (
                            <g
                                key={turn.id}
                                className="cursor-pointer"
                                onClick={() => onTurnSelect(turn.id)}
                            >
                                {/* Outer Static Highlight Ring */}
                                <circle
                                    cx={turn.cx} cy={turn.cy} r="18"
                                    fill="none"
                                    stroke={selectedTurn === turn.id ? '#fbbf24' : '#ef4444'}
                                    strokeWidth="2.5"
                                    opacity="0.7"
                                />

                                {/* Inner Dot */}
                                <circle
                                    cx={turn.cx} cy={turn.cy} r="9"
                                    fill={selectedTurn === turn.id ? '#fbbf24' : '#1f2937'}
                                    stroke={selectedTurn === turn.id ? '#f59e0b' : '#ef4444'}
                                    strokeWidth="2.5"
                                />

                                {/* Label Tag */}
                                <g transform={`translate(${turn.cx}, ${turn.cy - 40})`}>
                                    <rect x="-38" y="-13" width="76" height="24" rx="5" fill="#111827" fillOpacity="0.9" stroke="#374151" strokeWidth="1" />
                                    <text x="0" y="2" fill="white" fontSize="11" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">{turn.name}</text>
                                </g>
                            </g>
                        ))}

                        {/* User-placed markers (shown in placement mode) */}
                        {placementMode && placedMarkers.map((marker) => (
                            <g key={`placed-${marker.id}`}>
                                {/* Green marker for placed turns */}
                                <circle
                                    cx={marker.cx} cy={marker.cy} r="18"
                                    fill="none"
                                    stroke="#22c55e"
                                    strokeWidth="3"
                                    opacity="0.9"
                                />
                                <circle
                                    cx={marker.cx} cy={marker.cy} r="8"
                                    fill="#22c55e"
                                />
                                {/* Label */}
                                <g transform={`translate(${marker.cx}, ${marker.cy - 35})`}>
                                    <rect x="-20" y="-12" width="40" height="22" rx="4" fill="#166534" stroke="#22c55e" strokeWidth="1" />
                                    <text x="0" y="2" fill="white" fontSize="12" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">T{marker.id}</text>
                                </g>
                            </g>
                        ))}
                    </g>
                ) : (
                    <text x="1200" y="1300" fill="white" textAnchor="middle" className="text-xl font-mono tracking-widest opacity-50">MAP NOT AVAILABLE // {trackId.toUpperCase()}</text>
                )}
            </svg>
        </div>
    );
};
