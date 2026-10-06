export type PageId = 'lerobot' | 'rosbag' | 'mcap' | 'formats';

export const SERIES: { id: PageId; path: string; tab: string; title: string; blurb: string }[] = [
  {
    id: 'lerobot',
    path: '',
    tab: 'LeRobot',
    title: "A LeRobot dataset stores synced data. It doesn't sync it.",
    blurb: 'What the format promises, why pipelines still need a time-sync step, and the Ray Summit slide decoded.',
  },
  {
    id: 'rosbag',
    path: 'rosbag/',
    tab: 'ROS bags',
    title: 'A ROS bag records what the robot heard, in the order it heard it.',
    blurb: 'How rosbag and rosbag2 record a message bus, what lands on disk, and what bites when you train on it.',
  },
  {
    id: 'mcap',
    path: 'mcap/',
    tab: 'MCAP',
    title: 'MCAP is a log file that knows where everything is.',
    blurb: 'The container under ROS 2 bags: records, chunks, the summary at the end, and how readers seek.',
  },
  {
    id: 'formats',
    path: 'formats/',
    tab: 'Which format?',
    title: 'Which robot data format, when.',
    blurb: 'Raw logs, training formats, viewers and converters, as one map you can click through.',
  },
];

export const pageHref = (id: PageId) => `${import.meta.env.BASE_URL}${SERIES.find((s) => s.id === id)!.path}`;

export const LEROBOT_SHA = '8c920c4270460851cedd2737657584586d3dc66f';
export const lerobotSrc = (path: string, lines: string) =>
  `https://github.com/huggingface/lerobot/blob/${LEROBOT_SHA}/${path}#${lines}`;
