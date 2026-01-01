import { useState, useRef } from 'react';
import { Uploader } from './components/Uploader';
import { StrategyForm } from './components/StrategyForm';
import { ResultsTable } from './components/ResultTable';
import { ElevationChart } from './components/ElevationChart';
import { parseGPX } from './utils/gpxParser';
import { predictTime, updateWaypoints, calculateAdjustedStrategy } from './utils/calculations';
import type { Strategy, CourseData } from './types';
import html2canvas from 'html2canvas'; // Import html2canvas
import './App.css';

const DEFAULT_STRATEGY: Strategy = {
  mode: 'pace',
  targetHours: 10,
  targetMinutes: 0,
  basePace: 9.0, // 9 min/km
  climbThreshold: 10, // 10%
  climbPace: 18.0, // 18 min/km (walking)
  descentPace: 8.0, // 8 min/km
  aidStationTime: 15, // 15 min
  startTime: "07:00",
  paceDistribution: 100 // 100% = even pace
};

function App() {
  const [strategy, setStrategy] = useState<Strategy>(DEFAULT_STRATEGY);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const mainRef = useRef<HTMLElement>(null); // Ref for main content

  const handleUpload = (text: string) => {
    try {
      const data = parseGPX(text);
      setCourseData(data);
    } catch (e) {
      alert("GPXの読み込みに失敗しました。");
      console.error(e);
    }
  };

  const handleStrategyChange = (newStrategy: Strategy) => {
    setStrategy(newStrategy);
  };

  const handleExportPng = async () => {
    if (!mainRef.current) return;

    try {
      const canvas = await html2canvas(mainRef.current, { scale: 2 });
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'trail-pace-prediction.png';
      link.click();
    } catch (err) {
      console.error("Export failed", err);
      alert("画像の保存に失敗しました。");
    }
  };

  const resultData = courseData ? (() => {
    const adjustedStrategy = calculateAdjustedStrategy(
      courseData.trackPoints,
      courseData.wayPoints,
      courseData.totalDistance,
      strategy
    );

    const predictedTracks = predictTime(courseData.trackPoints, adjustedStrategy);
    const predictedWaypoints = updateWaypoints(courseData.wayPoints, predictedTracks);
    const lastPt = predictedTracks[predictedTracks.length - 1];
    const totalRunTime = lastPt ? (lastPt.predictedTime || 0) : 0;

    return {
      tracks: predictedTracks,
      waypoints: predictedWaypoints,
      totalTime: totalRunTime,
      finalStrategy: adjustedStrategy
    };
  })() : null;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h1>トレイルランニング レースタイム予測ツール</h1>
        <p>GPXと走力・戦略からレース時間をシミュレーションします</p>
        <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#555' }}>
          <p>
            使い方はこちらを参照 → <a href="https://note.com/yo_hide/n/n71bf131caefc" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', textDecoration: 'none' }}>note:トレラン レースタイム予測ツール</a>
          </p>
          <p>
            何かありましたらこちらへ → <a href="https://x.com/yo_hide" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', textDecoration: 'none' }}>X:ひでぴこ</a>
          </p>
          <p>
            元祖区間タイム計測ツールはこちら → <a href="https://trailflow.jp" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', textDecoration: 'none' }}>TrailFlow</a>
          </p>
        </div>
      </header>

      <main ref={mainRef} style={{ background: '#fff', padding: '10px' }}>
        {!courseData && <Uploader onUpload={handleUpload} />}

        {courseData && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
              <div>
                <strong>距離:</strong> {(courseData.totalDistance / 1000).toFixed(1)}km /
                <strong> 獲得標高:</strong> {Math.round(courseData.elevationGain)}m
              </div>
              <div>
                <button
                  onClick={handleExportPng}
                  style={{ padding: '5px 10px', marginRight: '10px', cursor: 'pointer', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px' }}
                >
                  画像として保存
                </button>
                <button
                  onClick={() => setCourseData(null)}
                  style={{ padding: '5px 10px', cursor: 'pointer', background: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  リセット
                </button>
              </div>
            </div>

            <StrategyForm
              strategy={strategy}
              displayStrategy={resultData?.finalStrategy || strategy}
              onChange={handleStrategyChange}
            />

            {resultData && (
              <>
                <ElevationChart data={resultData.tracks} wayPoints={resultData.waypoints} strategy={resultData.finalStrategy} />
                <ResultsTable
                  wayPoints={resultData.waypoints}
                  totalDistance={courseData.totalDistance}
                  totalTime={resultData.totalTime}
                  strategy={resultData.finalStrategy}
                />
              </>
            )}
          </div>
        )}
      </main>

      <footer style={{ marginTop: '50px', textAlign: 'center', color: '#888', fontSize: '0.8em' }}>
        <p>Trail Run Pace Predictor</p>
      </footer>
    </div>
  );
}

export default App;
