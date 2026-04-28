'use client';

import {useMemo, useRef, useState} from 'react';
import YouTube, {YouTubeEvent, YouTubePlayer} from 'react-youtube';
import {ENABLE_WORK_MUSIC, YT_PLAYLIST_ID} from './config';

export default function YoutubeMusicPlayer() {
	const enabled = ENABLE_WORK_MUSIC && !!YT_PLAYLIST_ID;

	const playerRef = useRef<YouTubePlayer | null>(null);
	const [playing, setPlaying] = useState(false);
	const [minimized, setMinimized] = useState(false);
	const [volume, setVolume] = useState(50);

	const opts = useMemo(
		() => ({
			height: minimized ? '90' : '180',
			width: minimized ? '160' : '320',
			playerVars: {
				listType: 'playlist',
				list: YT_PLAYLIST_ID,
				rel: 0,
				modestbranding: 1,
				iv_load_policy: 3,
				playsinline: 1,
				autoplay: 0,
			},
		}),
		[minimized]
	);

	const onReady = (e: YouTubeEvent) => {
		playerRef.current = e.target;
		try {
			playerRef.current.setVolume(volume);
		} catch {}
	};

	const onStateChange = (e: YouTubeEvent) => {
		if (e.data === 1) setPlaying(true);
		else if (e.data === 2 || e.data === 0) setPlaying(false);
	};

	const togglePlay = () => {
		if (!playerRef.current) return;
		if (playing) playerRef.current.pauseVideo();
		else playerRef.current.playVideo();
	};

	const next = () => playerRef.current?.nextVideo();
	const prev = () => playerRef.current?.previousVideo();

	const onChangeVolume = (v: number) => {
		setVolume(v);
		try {
			playerRef.current?.setVolume(v);
		} catch {}
	};

	if (!enabled) return null;

	return (
		<div
			style={{
				position: 'fixed',
				right: 16,
				bottom: 16,
				zIndex: 50,
				background: 'rgba(0,0,0,0.7)',
				color: '#fff',
				borderRadius: 12,
				boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
				backdropFilter: 'saturate(120%) blur(6px)',
				padding: 8,
			}}
			aria-label="作業用BGMプレイヤー"
		>
			<div style={{display: 'flex', alignItems: 'center', gap: 8}}>
				<YouTube iframeClassName="yt-iframe" opts={opts as any} onReady={onReady} onStateChange={onStateChange} />
				<div style={{display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160}}>
					<div style={{display: 'flex', gap: 8}}>
						<button onClick={prev} aria-label="前へ">⏮️</button>
						<button onClick={togglePlay} aria-label={playing ? '一時停止' : '再生'}>{playing ? '⏸️' : '▶️'}</button>
						<button onClick={next} aria-label="次へ">⏭️</button>
						<button onClick={() => setMinimized(m => !m)} aria-label="表示切替">{minimized ? '⇱' : '⇲'}</button>
					</div>
					<label style={{fontSize: 12}}>
						音量: {volume}
						<input
							type="range"
							min={0}
							max={100}
							step={1}
							value={volume}
							onChange={e => onChangeVolume(Number(e.target.value))}
							style={{width: '100%'}}
						/>
					</label>
				</div>
			</div>
		</div>
	);
}


