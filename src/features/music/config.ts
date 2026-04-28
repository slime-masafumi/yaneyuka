export const ENABLE_WORK_MUSIC =
	typeof process !== 'undefined' &&
	typeof process.env !== 'undefined' &&
	process.env.NEXT_PUBLIC_ENABLE_WORK_MUSIC === '1';

export const YT_PLAYLIST_ID =
	(typeof process !== 'undefined' && process.env.NEXT_PUBLIC_YT_MUSIC_PLAYLIST_ID) || '';



