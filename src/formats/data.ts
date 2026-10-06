/*
  The robot data ecosystem as data: formats, policies, and conversion tools.
  Every claim carries a link. Researched 2026-10-06 against repos, docs and the Hugging Face API.
*/

export type FormatId =
  | 'custom'
  | 'rosbag1'
  | 'rosbag2'
  | 'mcap'
  | 'lerobot3'
  | 'lerobot2'
  | 'rlds'
  | 'hdf5'
  | 'zarr'
  | 'wds'
  | 'lance'
  | 'viz';

export type Kind = 'log' | 'train' | 'viz';

export type Format = {
  id: FormatId;
  name: string;
  short: string;
  kind: Kind;
  what: string;
  tree: { line: string; note?: string; hl?: boolean }[];
  episode7: string;
  access: string;
  images: string;
  read: { code: string; src: string };
  link: string;
};

export const FORMATS: Format[] = [
  {
    id: 'custom',
    name: 'Your own logger',
    short: 'video + CSV',
    kind: 'log',
    what: 'Videos plus CSV or JSON logs from a custom recording script.',
    tree: [{ line: 'session_042/' }, { line: '  cam_front.mp4' }, { line: '  cam_wrist.mp4' }, { line: '  joints.csv', note: 'timestamp, q0..q6' }, { line: '  events.jsonl', note: 'gripper, buttons' }],
    episode7: 'Wherever you put it. Usually one folder per session, with episodes as time ranges.',
    access: 'Up to you.',
    images: 'Video files, one per camera.',
    read: { code: 'import pandas as pd\njoints = pd.read_csv("session_042/joints.csv")', src: 'https://pandas.pydata.org/docs/reference/api/pandas.read_csv.html' },
    link: 'https://github.com/huggingface/lerobot/blob/main/docs/source/porting_datasets_v3.mdx',
  },
  {
    id: 'rosbag1',
    name: 'ROS 1 bag',
    short: '.bag',
    kind: 'log',
    what: 'One indexed file of every message on the recorded topics, stamped with receive time. ROS 1 reached end of life in May 2025.',
    tree: [{ line: 'pick_cube.bag' }, { line: '  #ROSBAG V2.0' }, { line: '  bag header, chunks (lz4/bz2)' }, { line: '  index data, connections, chunk info', note: 'written on close' }],
    episode7: 'Episodes are not a concept. One recording is one bag; an episode is a time range you choose.',
    access: 'Random access by time and topic through the index.',
    images: 'sensor_msgs/Image or CompressedImage per frame.',
    read: {
      code: 'from pathlib import Path\nfrom rosbags.highlevel import AnyReader\n\nwith AnyReader([Path("pick_cube.bag")]) as reader:\n    conns = [c for c in reader.connections if c.topic == "/joint_states"]\n    for conn, t, raw in reader.messages(connections=conns):\n        msg = reader.deserialize(raw, conn.msgtype)',
      src: 'https://gitlab.com/ternaris/rosbags/-/blob/master/docs/topics/highlevel.rst',
    },
    link: 'http://wiki.ros.org/Bags/Format/2.0',
  },
  {
    id: 'rosbag2',
    name: 'ROS 2 bag',
    short: 'folder',
    kind: 'log',
    what: 'A folder with metadata.yaml and storage files: MCAP by default from Iron, sqlite3 .db3 before.',
    tree: [{ line: 'pick_cube/' }, { line: '  metadata.yaml', note: 'topics, counts, QoS, files' }, { line: '  pick_cube_0.mcap' }, { line: '  pick_cube_1.mcap', note: 'splits' }],
    episode7: 'Same as ROS 1: a time range inside a recording, possibly across split files.',
    access: 'Random access through MCAP indexes; sqlite3 by query.',
    images: 'sensor_msgs/Image or CompressedImage per frame.',
    read: {
      code: 'from pathlib import Path\nfrom rosbags.highlevel import AnyReader\n\nwith AnyReader([Path("pick_cube")]) as reader:\n    conns = [c for c in reader.connections if c.topic == "/joint_states"]\n    for conn, t, raw in reader.messages(connections=conns):\n        msg = reader.deserialize(raw, conn.msgtype)',
      src: 'https://gitlab.com/ternaris/rosbags/-/blob/master/docs/topics/highlevel.rst',
    },
    link: 'https://github.com/ros2/rosbag2',
  },
  {
    id: 'mcap',
    name: 'MCAP',
    short: '.mcap',
    kind: 'log',
    what: 'An open container for timestamped messages of any encoding, indexed at the end. The default rosbag2 storage.',
    tree: [{ line: 'pick_cube_0.mcap' }, { line: '  header, schemas, channels' }, { line: '  chunks of messages + message indexes' }, { line: '  summary, footer', note: 'written on close' }],
    episode7: 'A time range. Readers jump to it through the chunk indexes.',
    access: 'Random access by time and topic.',
    images: 'Whatever the schema says: ROS images, Protobuf, compressed video frames.',
    read: {
      code: 'from mcap_ros2.reader import read_ros2_messages\n\nfor msg in read_ros2_messages("pick_cube_0.mcap"):\n    print(msg.channel.topic, msg.log_time_ns, msg.ros_msg)',
      src: 'https://github.com/foxglove/mcap/blob/main/python/mcap-ros2-support/README.md',
    },
    link: 'https://mcap.dev/spec',
  },
  {
    id: 'lerobot3',
    name: 'LeRobot v3.0',
    short: 'parquet + mp4',
    kind: 'train',
    what: 'Frames in parquet, cameras as MP4, metadata in meta/. Many episodes per file. Hub-native, streamable.',
    tree: [
      { line: 'meta/info.json', note: 'fps, features, paths' },
      { line: 'meta/episodes/chunk-000/file-000.parquet', note: 'row 7: from 3150 to 3600', hl: true },
      { line: 'data/chunk-000/file-000.parquet', note: 'rows 3150 to 3599', hl: true },
      { line: 'videos/front/chunk-000/file-000.mp4', note: '105.0 s to 120.0 s', hl: true },
    ],
    episode7: 'A slice of shared files. meta/episodes says which rows and which video seconds.',
    access: 'Random access (LeRobotDataset) or streaming (StreamingLeRobotDataset).',
    images: 'MP4 per camera, AV1 by default.',
    read: {
      code: 'from lerobot.datasets import LeRobotDataset\n\ndataset = LeRobotDataset("lerobot/svla_so101_pickplace")\nsample = dataset[100]',
      src: 'https://github.com/huggingface/lerobot/blob/main/docs/source/lerobot-dataset-v3.mdx',
    },
    link: 'https://github.com/huggingface/lerobot/blob/main/docs/source/lerobot-dataset-v3.mdx',
  },
  {
    id: 'lerobot2',
    name: 'LeRobot v2.x',
    short: 'file per episode',
    kind: 'train',
    what: 'The previous LeRobot layout: one parquet and one MP4 per episode. Still what openpi and NVIDIA GR00T read.',
    tree: [
      { line: 'meta/info.json, episodes.jsonl, tasks.jsonl' },
      { line: 'meta/modality.json', note: 'GR00T only' },
      { line: 'data/chunk-000/episode_000007.parquet', hl: true },
      { line: 'videos/chunk-000/front/episode_000007.mp4', hl: true },
    ],
    episode7: 'Its own files: one parquet, one MP4 per camera.',
    access: 'Random access; many small files at scale.',
    images: 'MP4 per camera per episode.',
    read: {
      code: '# openpi builds its loader on LeRobot pinned at a v2.1-era commit\ndataset = lerobot_dataset.LeRobotDataset(\n    repo_id,\n    delta_timestamps={k: [t / fps for t in range(action_horizon)] for k in action_keys},\n)',
      src: 'https://github.com/Physical-Intelligence/openpi/blob/main/src/openpi/training/data_loader.py',
    },
    link: 'https://github.com/NVIDIA/Isaac-GR00T/blob/main/getting_started/data_preparation.md',
  },
  {
    id: 'rlds',
    name: 'RLDS',
    short: 'TFDS / TFRecord',
    kind: 'train',
    what: 'Episodes of steps stored as TFRecord shards through TensorFlow Datasets. The Open X-Embodiment format.',
    tree: [
      { line: 'droid_100/1.0.0/dataset_info.json' },
      { line: 'droid_100/1.0.0/features.json' },
      { line: '...-train.tfrecord-00003-of-00031', note: 'episode 7 is a record in some shard', hl: true },
    ],
    episode7: 'One record inside a TFRecord shard. You find it by reading, not by index.',
    access: 'Sequential streaming with shuffle buffers.',
    images: 'Encoded images per step, no video.',
    read: {
      code: 'import tensorflow_datasets as tfds\n\nds = tfds.load("libero_10_no_noops", data_dir=data_dir, split="train")\nfor episode in ds:\n    for step in episode["steps"].as_numpy_iterator():\n        image, action = step["observation"]["image"], step["action"]',
      src: 'https://github.com/Physical-Intelligence/openpi/blob/main/examples/libero/convert_libero_data_to_lerobot.py',
    },
    link: 'https://github.com/google-research/rlds',
  },
  {
    id: 'hdf5',
    name: 'HDF5',
    short: 'robomimic, ALOHA',
    kind: 'train',
    what: 'Arrays in a hierarchical file. Four layouts in use: robomimic (one file, demo groups), ACT/ALOHA (file per episode), LIBERO, RoboCasa.',
    tree: [
      { line: 'dataset.hdf5', note: 'robomimic layout' },
      { line: '  data/demo_7/actions  (N, A)', hl: true },
      { line: '  data/demo_7/obs/agentview_image', hl: true },
      { line: 'episode_7.hdf5', note: 'ALOHA layout: a file per episode', hl: true },
    ],
    episode7: 'A group (robomimic) or a whole file (ALOHA).',
    access: 'Random access inside a file. No streaming story.',
    images: 'Raw per-frame arrays, no video.',
    read: {
      code: 'import h5py\n\nf = h5py.File(dataset_path, "r")\ndemo = f["data/demo_7"]\nactions = demo["actions"][:]\nimages = demo["obs/agentview_image"][:]',
      src: 'https://github.com/ARISE-Initiative/robomimic/blob/master/examples/notebooks/datasets.ipynb',
    },
    link: 'https://robomimic.github.io/docs/datasets/overview.html',
  },
  {
    id: 'zarr',
    name: 'Zarr',
    short: 'ReplayBuffer',
    kind: 'train',
    what: 'Diffusion Policy\'s ReplayBuffer: time-major arrays under data/ and cumulative episode ends in meta/.',
    tree: [
      { line: 'pusht_replay.zarr/' },
      { line: '  data/action  [ends[6]:ends[7]]', hl: true },
      { line: '  data/img     [ends[6]:ends[7]]', hl: true },
      { line: '  meta/episode_ends', note: 'cumulative frame counts' },
    ],
    episode7: 'A slice of every array, from episode_ends[6] to episode_ends[7].',
    access: 'Random access by time index; usually copied into memory.',
    images: 'Per-frame arrays with image codecs (JPEG-XL in UMI).',
    read: {
      code: 'from diffusion_policy.common.replay_buffer import ReplayBuffer\n\nbuf = ReplayBuffer.copy_from_path(zarr_path, keys=["img", "state", "action"])\nprint(buf.n_episodes)',
      src: 'https://github.com/real-stanford/diffusion_policy/blob/main/diffusion_policy/dataset/pusht_image_dataset.py',
    },
    link: 'https://github.com/real-stanford/diffusion_policy/blob/main/diffusion_policy/common/replay_buffer.py',
  },
  {
    id: 'wds',
    name: 'WebDataset',
    short: 'tar shards',
    kind: 'train',
    what: 'Tar shards of samples that share a key prefix. Used by RDT2 and TRI\'s VLA Foundry, not by the mainstream VLA trainers.',
    tree: [{ line: 'shard-000012.tar' }, { line: '  7_0012.image.jpg', hl: true }, { line: '  7_0012.action.npy', note: 'a preprocessed action chunk', hl: true }, { line: '  7_0012.meta.json', hl: true }],
    episode7: 'Scattered across samples. Shards hold training samples, not episodes.',
    access: 'Streaming only, with shard-level shuffle.',
    images: 'Per-sample JPEG.',
    read: {
      code: 'import webdataset as wds\n\nds = wds.WebDataset(url).shuffle(1000).decode("pil").to_tuple("png", "json")',
      src: 'https://github.com/webdataset/webdataset',
    },
    link: 'https://github.com/webdataset/webdataset',
  },
  {
    id: 'lance',
    name: 'Lance',
    short: 'LeRobot backend',
    kind: 'train',
    what: 'LeRobot v3.0 stored as Lance tables, with MP4s as blobs. Read-only; random access straight from object storage.',
    tree: [{ line: 'meta/', note: 'unchanged' }, { line: 'frames.lance', note: 'tabular data', hl: true }, { line: 'videos.lance', note: 'MP4 as blobs', hl: true }],
    episode7: 'Rows in the frames table, video bytes in the videos table.',
    access: 'Random access from object storage.',
    images: 'MP4 blobs (camera features must be video).',
    read: { code: 'from lerobot.datasets import LeRobotDataset\n\ndataset = LeRobotDataset("lance-format/pusht-lance")', src: 'https://github.com/huggingface/lerobot/blob/main/docs/source/lerobot-dataset-v3.mdx' },
    link: 'https://docs.lancedb.com/training/lerobot',
  },
  {
    id: 'viz',
    name: 'Viewers',
    short: 'Foxglove, Rerun',
    kind: 'viz',
    what: 'Foxglove opens bags and MCAP. Rerun opens .rrd and MCAP. lerobot-dataset-viz drives both.',
    tree: [{ line: 'lerobot_pusht_episode_0.rrd', note: 'Rerun recording' }, { line: 'ws://127.0.0.1:8765', note: 'Foxglove live view' }],
    episode7: 'Whatever you open.',
    access: 'Interactive.',
    images: 'Decoded frames.',
    read: {
      code: 'lerobot-dataset-viz --repo-id lerobot/pusht --episode-index 7\nlerobot-dataset-viz --repo-id lerobot/pusht --episode-index 7 --display-mode foxglove',
      src: 'https://github.com/huggingface/lerobot/blob/main/src/lerobot/scripts/lerobot_dataset_viz.py',
    },
    link: 'https://rerun.io',
  },
];

export type PolicyId = 'lerobotp' | 'openpi' | 'gr00t' | 'openvla' | 'robomimic' | 'act' | 'dp' | 'rdt2';

export const POLICIES: { id: PolicyId; name: string; models: string; reads: FormatId; also?: FormatId; note: string; link: string }[] = [
  { id: 'lerobotp', name: 'LeRobot', models: 'ACT, Diffusion, SmolVLA, pi0, pi0.5, GR00T N1.7, X-VLA', reads: 'lerobot3', note: 'Reads v3.0. Camera keys must match the pretrained policy (--rename_map).', link: 'https://github.com/huggingface/lerobot/blob/main/docs/source/smolvla.mdx' },
  { id: 'openpi', name: 'openpi', models: 'pi0, pi0-FAST, pi0.5', reads: 'lerobot2', also: 'rlds', note: 'LeRobot pinned to a May 2025 commit (codebase v2.1). RLDS only for full DROID.', link: 'https://github.com/Physical-Intelligence/openpi#fine-tuning-base-models-on-your-own-data' },
  { id: 'gr00t', name: 'Isaac-GR00T', models: 'GR00T N1.5, N1.6, N1.7', reads: 'lerobot2', note: 'LeRobot v2 flavor plus meta/modality.json. Convert v3.0 down first.', link: 'https://github.com/NVIDIA/Isaac-GR00T#data-format' },
  { id: 'openvla', name: 'OpenVLA, Octo', models: 'OpenVLA, Octo', reads: 'rlds', note: 'Native RLDS, including Open X-Embodiment mixtures.', link: 'https://github.com/openvla/openvla' },
  { id: 'robomimic', name: 'robomimic', models: 'robomimic, Isaac Lab Mimic', reads: 'hdf5', note: 'data/demo_N groups; actions normalized to [-1, 1].', link: 'https://robomimic.github.io/docs/datasets/overview.html' },
  { id: 'act', name: 'ACT (original)', models: 'ACT, ALOHA', reads: 'hdf5', note: 'One HDF5 file per episode.', link: 'https://github.com/tonyzhaozh/act/blob/main/utils.py' },
  { id: 'dp', name: 'Diffusion Policy (original)', models: 'Diffusion Policy, UMI', reads: 'zarr', note: 'Zarr ReplayBuffer; robomimic HDF5 is converted to one on load.', link: 'https://github.com/real-stanford/diffusion_policy/blob/main/diffusion_policy/common/replay_buffer.py' },
  { id: 'rdt2', name: 'RDT2, VLA Foundry', models: 'RDT2, TRI VLA Foundry', reads: 'wds', note: 'WebDataset shards of preprocessed samples.', link: 'https://github.com/thu-ml/RDT2' },
];

export type Status = 'official' | 'vendor' | 'community';

export type Edge = {
  from: FormatId;
  to: FormatId;
  tool: string;
  cmd: string;
  status: Status;
  link: string;
  note: string;
};

export const EDGES: Edge[] = [
  { from: 'rosbag1', to: 'mcap', tool: 'mcap convert', cmd: 'mcap convert pick_cube.bag pick_cube.mcap', status: 'official', link: 'https://github.com/foxglove/mcap/blob/main/website/docs/guides/cli.md', note: 'Keeps every message; ROS 1 encoding inside MCAP.' },
  { from: 'rosbag1', to: 'rosbag2', tool: 'rosbags-convert', cmd: 'rosbags-convert pick_cube.bag', status: 'community', link: 'https://gitlab.com/ternaris/rosbags/-/blob/master/docs/topics/convert.rst', note: 'Pure Python. Refuses unindexed bags; reindex first.' },
  { from: 'rosbag2', to: 'mcap', tool: 'mcap convert / ros2 bag convert', cmd: 'mcap convert pick_cube_0.db3 pick_cube_0.mcap', status: 'official', link: 'https://github.com/ros2/rosbag2#converting-bags-merge-split-etc-', note: 'Pre-Iron .db3 has no definitions: use ros2 bag convert with the workspace sourced.' },
  { from: 'mcap', to: 'lerobot3', tool: 'mcap-to-lerobot (Isaac ROS), convert_ros_to_lerobot.py (OpenTau)', cmd: '# no official LeRobot path yet (RFC #4368)', status: 'vendor', link: 'https://docs.nvidia.com/learning/physical-ai/gr00t-e2e-workflow/latest/real-robot-workflow/real-data-export.html', note: 'Align first: resample every topic onto one fps (Part 1). Audit the output.' },
  { from: 'custom', to: 'lerobot3', tool: 'LeRobotDataset.create + add_frame', cmd: 'ds = LeRobotDataset.create(repo_id, fps=30, features=...)\nds.add_frame(frame); ds.save_episode(); ds.finalize()', status: 'official', link: 'https://github.com/huggingface/lerobot/blob/main/docs/source/porting_datasets_v3.mdx', note: 'You write the alignment. Call finalize() before push_to_hub().' },
  { from: 'custom', to: 'rlds', tool: 'rlds_dataset_builder', cmd: 'tfds build', status: 'community', link: 'https://github.com/kpertsch/rlds_dataset_builder', note: 'What OpenVLA points to for new data.' },
  { from: 'lerobot2', to: 'lerobot3', tool: 'convert_dataset_v21_to_v30.py', cmd: 'python -m lerobot.scripts.convert_dataset_v21_to_v30 --repo-id <id>', status: 'official', link: 'https://github.com/huggingface/lerobot/blob/main/src/lerobot/scripts/convert_dataset_v21_to_v30.py', note: 'Runs sequentially. No v2.0 to v3.0 path.' },
  { from: 'lerobot3', to: 'lerobot2', tool: 'convert_v3_to_v2.py (GR00T)', cmd: 'uv run scripts/lerobot_conversion/convert_v3_to_v2.py', status: 'vendor', link: 'https://github.com/NVIDIA/Isaac-GR00T/tree/main/scripts/lerobot_conversion', note: 'For GR00T and openpi. Add meta/modality.json for GR00T.' },
  { from: 'rlds', to: 'lerobot3', tool: 'openx2lerobot (any4lerobot), port_droid.py', cmd: '# see any4lerobot/openx2lerobot', status: 'community', link: 'https://github.com/Tavish9/any4lerobot/tree/main/openx2lerobot', note: 'LeRobot\'s own port_droid.py covers DROID; full DROID is about a week on one machine.' },
  { from: 'rlds', to: 'lerobot2', tool: 'openpi LIBERO converter', cmd: 'uv run examples/libero/convert_libero_data_to_lerobot.py --data_dir <rlds>', status: 'vendor', link: 'https://github.com/Physical-Intelligence/openpi/blob/main/examples/libero/convert_libero_data_to_lerobot.py', note: 'Targets openpi\'s pinned LeRobot. Use it as a template.' },
  { from: 'lerobot3', to: 'rlds', tool: 'lerobot2rlds (any4lerobot)', cmd: '# see any4lerobot/lerobot2rlds', status: 'community', link: 'https://github.com/Tavish9/any4lerobot/tree/main/lerobot2rlds', note: 'The only one found. Beam mode can drop episodes.' },
  { from: 'hdf5', to: 'lerobot3', tool: 'any4lerobot, RoboCasa and Isaac Lab Arena scripts', cmd: '# libero2lerobot, robomind2lerobot, convert_hdf5_to_lerobot.py', status: 'community', link: 'https://github.com/Tavish9/any4lerobot', note: 'No first-party LeRobot tool for HDF5.' },
  { from: 'hdf5', to: 'lerobot2', tool: 'openpi ALOHA converter', cmd: 'uv run examples/aloha_real/convert_aloha_data_to_lerobot.py --raw-dir <hdf5>', status: 'vendor', link: 'https://github.com/Physical-Intelligence/openpi/blob/main/examples/aloha_real/convert_aloha_data_to_lerobot.py', note: 'Targets v2.0; an open issue calls it outdated and memory-heavy.' },
  { from: 'zarr', to: 'lerobot3', tool: 'forge', cmd: 'forge convert pusht.zarr ./out', status: 'community', link: 'https://github.com/arpitg1304/forge', note: 'LeRobot\'s own Zarr scripts were removed in March 2025.' },
  { from: 'lerobot3', to: 'lance', tool: 'lerobot-lance-convert', cmd: 'lerobot-lance-convert --repo-id <id>', status: 'vendor', link: 'https://github.com/lancedb/lerobot-lancedb', note: 'Videos are not re-encoded. The result is read-only.' },
  { from: 'lerobot3', to: 'viz', tool: 'lerobot-dataset-viz', cmd: 'lerobot-dataset-viz --repo-id <id> --episode-index 0', status: 'official', link: 'https://github.com/huggingface/lerobot/blob/main/src/lerobot/scripts/lerobot_dataset_viz.py', note: 'Rerun by default, --display-mode foxglove for Foxglove.' },
  { from: 'mcap', to: 'viz', tool: 'open in Foxglove or Rerun', cmd: 'rerun pick_cube_0.mcap', status: 'official', link: 'https://github.com/rerun-io/rerun/blob/main/docs/content/concepts/logging-and-ingestion/mcap.md', note: 'Both open MCAP directly.' },
];

export const STATUS_LABEL: Record<Status, string> = {
  official: 'official',
  vendor: 'vendor',
  community: 'community',
};
