import type { TrackPoint, WayPoint, CourseData } from '../types';
import { getDistance } from './geoUtils';

export const parseGPX = (gpxText: string): CourseData => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxText, "text/xml");

    const trkpts = xmlDoc.getElementsByTagName("trkpt");
    const trackPoints: TrackPoint[] = [];
    let totalDist = 0;
    let eleGain = 0;
    let eleLoss = 0;

    // Track Points
    for (let i = 0; i < trkpts.length; i++) {
        const pt = trkpts[i];
        const lat = parseFloat(pt.getAttribute("lat") || "0");
        const lon = parseFloat(pt.getAttribute("lon") || "0");
        const ele = parseFloat(pt.getElementsByTagName("ele")[0]?.textContent || "0");

        let dist = 0;
        let gradient = 0;

        if (i > 0) {
            const prev = trackPoints[i - 1];
            dist = getDistance({ lat: prev.lat, lon: prev.lon }, { lat, lon });
            totalDist += dist;

            const eleDiff = ele - prev.ele;
            if (eleDiff > 0) eleGain += eleDiff;
            if (eleDiff < 0) eleLoss += Math.abs(eleDiff);

            if (dist > 0) {
                gradient = (eleDiff / dist) * 100;
            }
        }

        trackPoints.push({
            lat,
            lon,
            ele,
            distanceFromStart: totalDist,
            gradient: i > 0 ? gradient : 0
        });
    }

    // Waypoints (Aid stations etc)
    const wpts = xmlDoc.getElementsByTagName("wpt");
    const wayPoints: WayPoint[] = [];

    for (let i = 0; i < wpts.length; i++) {
        const pt = wpts[i];
        const lat = parseFloat(pt.getAttribute("lat") || "0");
        const lon = parseFloat(pt.getAttribute("lon") || "0");
        const ele = parseFloat(pt.getElementsByTagName("ele")[0]?.textContent || "0");
        const name = pt.getElementsByTagName("name")[0]?.textContent || `Point ${i + 1}`;

        // Find closest track point to determine distance along the track
        let minD = Infinity;
        let matchDist = 0;

        // Simple nearest neighbor search on track points
        // This assumes the waypoint is meant to be ON the track
        for (const tp of trackPoints) {
            const d = getDistance({ lat, lon }, { lat: tp.lat, lon: tp.lon });
            if (d < minD) {
                minD = d;
                matchDist = tp.distanceFromStart;
            }
        }

        // Only include if reasonably close (e.g. < 500m)? 
        // For now we accept all but rely on the user providing good GPX.
        wayPoints.push({
            lat, lon, ele, name, distanceFromStart: matchDist
        });
    }

    wayPoints.sort((a, b) => a.distanceFromStart - b.distanceFromStart);

    return {
        trackPoints,
        wayPoints,
        totalDistance: totalDist,
        elevationGain: eleGain,
        elevationLoss: eleLoss
    };
}
