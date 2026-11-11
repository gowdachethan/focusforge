import { RoboticsSkill } from '../types';

export const INITIAL_ROBOTICS_SKILLS: RoboticsSkill[] = [
  {
    id: 'skill-ros2',
    name: 'ROS 2',
    category: 'Robotics Middleware',
    summary: 'Robot Operating System 2: DDS architecture, nodes, topics, services, actions, TF2, URDF, and launch systems.',
    roadmap: [
      { id: 'ros2-b1', level: 'Beginner', title: 'Workspace setup (colcon), Nodes, Topics & CLI tools', completed: false },
      { id: 'ros2-b2', level: 'Beginner', title: 'Custom msg/srv interfaces & Launch files (Python)', completed: false },
      { id: 'ros2-i1', level: 'Intermediate', title: 'Services, Actions, Parameters & Lifecycle Nodes', completed: false },
      { id: 'ros2-i2', level: 'Intermediate', title: 'URDF / Xacro modeling & TF2 coordinate transforms', completed: false },
      { id: 'ros2-a1', level: 'Advanced', title: 'ros2_control hardware interfaces & custom controller plugins', completed: false },
      { id: 'ros2-a2', level: 'Advanced', title: 'QoS tuning, Intra-process comms & real-time DDS profiling', completed: false },
    ],
    resources: [
      { id: 'res-ros2-1', label: 'Official ROS 2 Documentation (Jazzy / Humble)', url: 'https://docs.ros.org/', kind: 'Official Docs' },
      { id: 'res-ros2-2', label: 'ROS 2 Tutorials: Creating Packages & Nodes', url: 'https://docs.ros.org/en/jazzy/Tutorials.html', kind: 'Guide' },
    ],
    assignments: [
      { id: 'asg-ros2-1', title: 'Pub-Sub Sensor Telemetry Package', description: 'Publish simulated IMU & wheel odometry at 50 Hz and compute pose delta in a subscriber node.', completed: false },
      { id: 'asg-ros2-2', title: '6-DoF Arm URDF + TF2 Broadcaster', description: 'Model a 6-DoF manipulator in Xacro and inspect frame transforms in RViz2.', completed: false },
    ],
    milestones: [
      { id: 'mil-ros2-1', title: 'Multi-node ROS 2 workspace running cleanly via single launch file', completed: false },
      { id: 'mil-ros2-2', title: 'Closed-loop teleop & TF2 tree verified in RViz2', completed: false },
    ],
    notes: '',
    referenceLinks: [],
    studyMinutes: 0,
  },
  {
    id: 'skill-python',
    name: 'Python',
    category: 'Core Programming',
    summary: 'Scientific Python, NumPy/SciPy for kinematics & numerical methods, OOP, async I/O, and clean robotics scripting.',
    roadmap: [
      { id: 'py-b1', level: 'Beginner', title: 'Core syntax, OOP classes, type hints & virtualenvs', completed: false },
      { id: 'py-b2', level: 'Beginner', title: 'NumPy vectorized linear algebra & Matplotlib plotting', completed: false },
      { id: 'py-i1', level: 'Intermediate', title: 'SciPy optimization, ODE integration & signal filtering', completed: false },
      { id: 'py-i2', level: 'Intermediate', title: 'Testing (pytest), profiling & dataclasses', completed: false },
      { id: 'py-a1', level: 'Advanced', title: 'Multiprocessing, asyncio telemetry & C-extension bindings', completed: false },
    ],
    resources: [
      { id: 'res-py-1', label: 'Official Python Documentation', url: 'https://docs.python.org/3/', kind: 'Official Docs' },
      { id: 'res-py-2', label: 'NumPy Quickstart & Linear Algebra Guide', url: 'https://numpy.org/doc/stable/', kind: 'Official Docs' },
    ],
    assignments: [
      { id: 'asg-py-1', title: '2-Link Planar Arm Forward/Inverse Kinematics Solver', description: 'Compute end-effector trajectory and Jacobian singularities using NumPy.', completed: false },
    ],
    milestones: [
      { id: 'mil-py-1', title: 'Reusable kinematics & matrix toolkit tested with pytest', completed: false },
    ],
    notes: '',
    referenceLinks: [],
    studyMinutes: 0,
  },
  {
    id: 'skill-cpp',
    name: 'C++',
    category: 'Core Programming',
    summary: 'Modern C++17/20 for high-frequency control loops, Eigen linear algebra, memory safety, and ROS 2 C++ nodes.',
    roadmap: [
      { id: 'cpp-b1', level: 'Beginner', title: 'Pointers, references, RAII & STL containers', completed: false },
      { id: 'cpp-b2', level: 'Beginner', title: 'CMake build systems & debugging', completed: false },
      { id: 'cpp-i1', level: 'Intermediate', title: 'Smart pointers, move semantics & templates', completed: false },
      { id: 'cpp-i2', level: 'Intermediate', title: 'Eigen library for 3D transforms & control math', completed: false },
      { id: 'cpp-a1', level: 'Advanced', title: 'Lock-free concurrency, real-time loops & rclcpp components', completed: false },
    ],
    resources: [
      { id: 'res-cpp-1', label: 'cppreference.com Language Reference', url: 'https://en.cppreference.com/', kind: 'Reference' },
      { id: 'res-cpp-2', label: 'Eigen C++ Linear Algebra Docs', url: 'https://eigen.tuxfamily.org/dox/', kind: 'Official Docs' },
    ],
    assignments: [
      { id: 'asg-cpp-1', title: '1 kHz PID Loop Simulator in C++17', description: 'Implement discrete PID with anti-windup and Eigen state tracking.', completed: false },
    ],
    milestones: [
      { id: 'mil-cpp-1', title: 'Zero-warning CMake C++ node integrated into ROS 2', completed: false },
    ],
    notes: '',
    referenceLinks: [],
    studyMinutes: 0,
  },
  {
    id: 'skill-cv',
    name: 'Computer Vision',
    category: 'Perception & AI',
    summary: 'Camera geometry, calibration, epipolar geometry, feature matching, optical flow, visual odometry, and 3D reconstruction.',
    roadmap: [
      { id: 'cv-b1', level: 'Beginner', title: 'Pinhole camera model, intrinsics/extrinsics & distortion', completed: false },
      { id: 'cv-i1', level: 'Intermediate', title: 'Feature detectors (ORB/SIFT), homography & stereo depth', completed: false },
      { id: 'cv-i2', level: 'Intermediate', title: 'Epipolar geometry, essential/fundamental matrices & PnP', completed: false },
      { id: 'cv-a1', level: 'Advanced', title: 'Visual odometry, bundle adjustment & neural depth/pose', completed: false },
    ],
    resources: [
      { id: 'res-cv-1', label: 'First Principles of Computer Vision (Columbia)', url: 'https://fpcv.cs.columbia.edu/', kind: 'Course' },
    ],
    assignments: [
      { id: 'asg-cv-1', title: 'Checkerboard Camera Calibration & PnP Pose Estimator', description: 'Calibrate camera matrix K and estimate AprilTag/checkerboard 6-DoF pose.', completed: false },
    ],
    milestones: [
      { id: 'mil-cv-1', title: 'Monocular visual feature tracker estimating frame-to-frame motion', completed: false },
    ],
    notes: '',
    referenceLinks: [],
    studyMinutes: 0,
  },
  {
    id: 'skill-opencv',
    name: 'OpenCV',
    category: 'Perception & AI',
    summary: 'Practical real-time image processing pipelines in Python & C++: filtering, contours, ArUco markers, and camera streams.',
    roadmap: [
      { id: 'ocv-b1', level: 'Beginner', title: 'Mat operations, color spaces, thresholding & morphology', completed: false },
      { id: 'ocv-i1', level: 'Intermediate', title: 'Edge detection, Hough transforms, contours & ArUco markers', completed: false },
      { id: 'ocv-a1', level: 'Advanced', title: 'OpenCV DNN module, CUDA/GStreamer pipelines & cv_bridge', completed: false },
    ],
    resources: [
      { id: 'res-ocv-1', label: 'Official OpenCV Documentation & Tutorials', url: 'https://docs.opencv.org/', kind: 'Official Docs' },
    ],
    assignments: [
      { id: 'asg-ocv-1', title: 'ArUco Fiducial Localization Node', description: 'Detect ArUco markers from camera feed and publish TF pose in real time.', completed: false },
    ],
    milestones: [
      { id: 'mil-ocv-1', title: '30 FPS vision pipeline integrated via cv_bridge', completed: false },
    ],
    notes: '',
    referenceLinks: [],
    studyMinutes: 0,
  },
  {
    id: 'skill-ml',
    name: 'Machine Learning',
    category: 'AI & Data',
    summary: 'Supervised/unsupervised learning, regression, SVMs, ensembles, PCA, Kalman filtering foundations, and scikit-learn.',
    roadmap: [
      { id: 'ml-b1', level: 'Beginner', title: 'Linear/Logistic regression, cross-validation & metrics', completed: false },
      { id: 'ml-i1', level: 'Intermediate', title: 'Decision trees, Random Forests, XGBoost & SVMs', completed: false },
      { id: 'ml-a1', level: 'Advanced', title: 'Probabilistic modeling, GMMs, PCA & sensor anomaly detection', completed: false },
    ],
    resources: [
      { id: 'res-ml-1', label: 'scikit-learn User Guide', url: 'https://scikit-learn.org/stable/user_guide.html', kind: 'Official Docs' },
    ],
    assignments: [
      { id: 'asg-ml-1', title: 'IMU Gesture & Terrain Classifier', description: 'Classify robot terrain surface from accelerometer/gyro time-series windows.', completed: false },
    ],
    milestones: [
      { id: 'mil-ml-1', title: 'End-to-end scikit-learn pipeline with cross-validated F1 > 0.9', completed: false },
    ],
    notes: '',
    referenceLinks: [],
    studyMinutes: 0,
  },
  {
    id: 'skill-dl',
    name: 'Deep Learning',
    category: 'AI & Data',
    summary: 'PyTorch, CNNs, Vision Transformers, object detection (YOLO), semantic segmentation, and robot perception models.',
    roadmap: [
      { id: 'dl-b1', level: 'Beginner', title: 'Autograd, MLP, training loops & loss optimization in PyTorch', completed: false },
      { id: 'dl-i1', level: 'Intermediate', title: 'CNNs, ResNet transfer learning & object detection', completed: false },
      { id: 'dl-a1', level: 'Advanced', title: 'Transformers, ViT, point-cloud networks & ONNX export', completed: false },
    ],
    resources: [
      { id: 'res-dl-1', label: 'PyTorch Official Tutorials', url: 'https://pytorch.org/tutorials/', kind: 'Official Docs' },
    ],
    assignments: [
      { id: 'asg-dl-1', title: 'Custom Obstacle Detector Exported to ONNX', description: 'Fine-tune a lightweight vision detector and benchmark inference latency.', completed: false },
    ],
    milestones: [
      { id: 'mil-dl-1', title: 'Trained PyTorch perception model deployed cleanly in ONNX runtime', completed: false },
    ],
    notes: '',
    referenceLinks: [],
    studyMinutes: 0,
  },
  {
    id: 'skill-gazebo',
    name: 'Gazebo',
    category: 'Simulation',
    summary: 'Gazebo Sim (Harmonic/Garden): SDF worlds, physics engines, sensor plugins (LiDAR, RGB-D, IMU), and ros_gz_bridge.',
    roadmap: [
      { id: 'gaz-b1', level: 'Beginner', title: 'SDF world creation, model spawning & GUI inspection', completed: false },
      { id: 'gaz-i1', level: 'Intermediate', title: 'Differential-drive robot with LiDAR, depth camera & ros_gz_bridge', completed: false },
      { id: 'gaz-a1', level: 'Advanced', title: 'Custom Gazebo system plugins & multi-robot simulation', completed: false },
    ],
    resources: [
      { id: 'res-gaz-1', label: 'Gazebo Sim Official Documentation', url: 'https://gazebosim.org/docs', kind: 'Official Docs' },
    ],
    assignments: [
      { id: 'asg-gaz-1', title: 'Warehouse Mobile Robot World', description: 'Spawn a differential-drive robot with 2D LiDAR + IMU bridged to ROS 2.', completed: false },
    ],
    milestones: [
      { id: 'mil-gaz-1', title: 'Full sensor-equipped AMR running in Gazebo + RViz2', completed: false },
    ],
    notes: '',
    referenceLinks: [],
    studyMinutes: 0,
  },
  {
    id: 'skill-slam',
    name: 'SLAM',
    category: 'Autonomy & Localization',
    summary: 'Probabilistic robotics, Bayes filters, EKF/UKF, scan matching (ICP), 2D LiDAR SLAM (slam_toolbox), and Graph SLAM.',
    roadmap: [
      { id: 'slam-b1', level: 'Beginner', title: 'Occupancy grids, odometry motion models & sensor likelihoods', completed: false },
      { id: 'slam-i1', level: 'Intermediate', title: 'EKF localization (robot_localization) & 2D slam_toolbox', completed: false },
      { id: 'slam-a1', level: 'Advanced', title: 'Loop closure, pose-graph optimization & 3D LiDAR/Visual SLAM', completed: false },
    ],
    resources: [
      { id: 'res-slam-1', label: 'slam_toolbox GitHub & Docs', url: 'https://github.com/SteveMacenski/slam_toolbox', kind: 'Official Docs' },
      { id: 'res-slam-2', label: 'Cyrill Stachniss SLAM Lectures (YouTube)', url: 'https://www.youtube.com/@CyrillStachniss', kind: 'Course' },
    ],
    assignments: [
      { id: 'asg-slam-1', title: 'Map a Simulated Indoor Facility', description: 'Run slam_toolbox in Gazebo and save an accurate 2D occupancy map.', completed: false },
    ],
    milestones: [
      { id: 'mil-slam-1', title: 'Drift-corrected 2D map with loop closure verified', completed: false },
    ],
    notes: '',
    referenceLinks: [],
    studyMinutes: 0,
  },
  {
    id: 'skill-nav2',
    name: 'Navigation2',
    category: 'Autonomy & Localization',
    summary: 'Nav2 stack: AMCL localization, global/local costmaps, planners (Smac/NavFn), controllers (DWB/MPPI), and Behavior Trees.',
    roadmap: [
      { id: 'nav2-b1', level: 'Beginner', title: 'AMCL map localization & costmap layer configuration', completed: false },
      { id: 'nav2-i1', level: 'Intermediate', title: 'Global planners (Smac) & local controllers (DWB / MPPI)', completed: false },
      { id: 'nav2-a1', level: 'Advanced', title: 'Custom Nav2 Behavior Tree recovery & waypoint following', completed: false },
    ],
    resources: [
      { id: 'res-nav2-1', label: 'Nav2 Official Documentation', url: 'https://docs.nav2.org/', kind: 'Official Docs' },
    ],
    assignments: [
      { id: 'asg-nav2-1', title: 'Autonomous Waypoint Delivery in Gazebo', description: 'Navigate around dynamic obstacles using Nav2 + MPPI controller.', completed: false },
    ],
    milestones: [
      { id: 'mil-nav2-1', title: 'Multi-waypoint autonomous navigation without collisions', completed: false },
    ],
    notes: '',
    referenceLinks: [],
    studyMinutes: 0,
  },
  {
    id: 'skill-rl',
    name: 'Reinforcement Learning',
    category: 'AI & Control',
    summary: 'MDPs, Bellman equations, Q-learning, Policy Gradients, PPO/SAC, Gymnasium environments, and sim-to-real locomotion.',
    roadmap: [
      { id: 'rl-b1', level: 'Beginner', title: 'MDPs, Value Iteration, Q-Learning & Gymnasium basics', completed: false },
      { id: 'rl-i1', level: 'Intermediate', title: 'DQN, Actor-Critic & PPO continuous control', completed: false },
      { id: 'rl-a1', level: 'Advanced', title: 'SAC, reward shaping & domain randomization for sim-to-real', completed: false },
    ],
    resources: [
      { id: 'res-rl-1', label: 'OpenAI Spinning Up in Deep RL', url: 'https://spinningup.openai.com/', kind: 'Course' },
      { id: 'res-rl-2', label: 'Gymnasium Documentation', url: 'https://gymnasium.farama.org/', kind: 'Official Docs' },
    ],
    assignments: [
      { id: 'asg-rl-1', title: 'PPO Inverted Pendulum / Reacher Control', description: 'Train a PPO policy in Gymnasium and plot episodic return convergence.', completed: false },
    ],
    milestones: [
      { id: 'mil-rl-1', title: 'Continuous-action RL agent beating classical baseline in simulation', completed: false },
    ],
    notes: '',
    referenceLinks: [],
    studyMinutes: 0,
  },
  {
    id: 'skill-isaac-sim',
    name: 'NVIDIA Isaac Sim',
    category: 'Simulation',
    summary: 'Omniverse USD scenes, RTX photorealistic sensors, Isaac Lab GPU-parallel RL, and ROS 2 bridge.',
    roadmap: [
      { id: 'is-b1', level: 'Beginner', title: 'USD scene graph, URDF importer & Articulation Inspector', completed: false },
      { id: 'is-i1', level: 'Intermediate', title: 'ROS 2 OmniGraph camera/LiDAR bridge & synthetic data', completed: false },
      { id: 'is-a1', level: 'Advanced', title: 'Isaac Lab vectorized RL training & Replicator domain randomization', completed: false },
    ],
    resources: [
      { id: 'res-is-1', label: 'NVIDIA Isaac Sim Documentation', url: 'https://docs.omniverse.nvidia.com/isaacsim/latest/', kind: 'Official Docs' },
    ],
    assignments: [
      { id: 'asg-is-1', title: 'ROS 2 Navigation Bridge in Isaac Sim', description: 'Stream simulated stereo & LiDAR topics from Isaac Sim into Nav2.', completed: false },
    ],
    milestones: [
      { id: 'mil-is-1', title: 'Custom robot USD asset controlled via ROS 2 ActionGraph', completed: false },
    ],
    notes: '',
    referenceLinks: [],
    studyMinutes: 0,
  },
  {
    id: 'skill-edge-ai',
    name: 'Edge AI',
    category: 'Deployment & Systems',
    summary: 'Quantization (INT8/FP16), TensorRT, ONNX Runtime, OpenVINO, and deploying neural perception on Jetson / Raspberry Pi.',
    roadmap: [
      { id: 'edge-b1', level: 'Beginner', title: 'Model profiling, FLOPs/latency budgets & ONNX export', completed: false },
      { id: 'edge-i1', level: 'Intermediate', title: 'FP16 / INT8 quantization & TensorRT / OpenVINO engines', completed: false },
      { id: 'edge-a1', level: 'Advanced', title: 'Zero-copy DeepStream / Jetson pipelines under thermal budgets', completed: false },
    ],
    resources: [
      { id: 'res-edge-1', label: 'ONNX Runtime Documentation', url: 'https://onnxruntime.ai/docs/', kind: 'Official Docs' },
    ],
    assignments: [
      { id: 'asg-edge-1', title: 'FP32 vs INT8 Benchmark Report', description: 'Compare accuracy drop and FPS speedup on an edge vision model.', completed: false },
    ],
    milestones: [
      { id: 'mil-edge-1', title: 'Real-time quantized inference pipeline running < 25ms latency', completed: false },
    ],
    notes: '',
    referenceLinks: [],
    studyMinutes: 0,
  },
  {
    id: 'skill-industrial-auto',
    name: 'Industrial Automation',
    category: 'Automation & Manufacturing',
    summary: 'PLC ladder logic / Structured Text, Modbus/OPC-UA/EtherCAT fieldbuses, SCADA/HMI basics, and robotic workcell safety.',
    roadmap: [
      { id: 'ind-b1', level: 'Beginner', title: 'PLC scan cycle, Ladder Logic, timers/counters & relays', completed: false },
      { id: 'ind-i1', level: 'Intermediate', title: 'Modbus TCP, OPC-UA & industrial I/O interfacing', completed: false },
      { id: 'ind-a1', level: 'Advanced', title: 'Multi-axis motion synchronization & ISO safety interlocks', completed: false },
    ],
    resources: [
      { id: 'res-ind-1', label: 'OpenPLC Project Documentation', url: 'https://autonomylogic.com/docs/', kind: 'Official Docs' },
    ],
    assignments: [
      { id: 'asg-ind-1', title: 'Conveyor Pick-and-Place Interlock Ladder Program', description: 'Simulate conveyor photo-eye triggers, safety E-stop, and robot handshake.', completed: false },
    ],
    milestones: [
      { id: 'mil-ind-1', title: 'PLC-to-Python OPC-UA/Modbus telemetry bridge working end-to-end', completed: false },
    ],
    notes: '',
    referenceLinks: [],
    studyMinutes: 0,
  },
  {
    id: 'skill-embedded-robo',
    name: 'Embedded Robotics',
    category: 'Hardware & Firmware',
    summary: 'STM32/ESP32 firmware, PWM motor control, quadrature encoders, SPI/I2C/UART/CAN bus, and micro-ROS.',
    roadmap: [
      { id: 'emb-b1', level: 'Beginner', title: 'GPIO, hardware timers, PWM & quadrature encoder reading', completed: false },
      { id: 'emb-i1', level: 'Intermediate', title: 'UART/I2C/SPI IMU drivers, DMA & FreeRTOS tasks', completed: false },
      { id: 'emb-a1', level: 'Advanced', title: 'CAN bus motor control & micro-ROS closed-loop firmware', completed: false },
    ],
    resources: [
      { id: 'res-emb-1', label: 'micro-ROS Official Documentation', url: 'https://micro.ros.org/docs/', kind: 'Official Docs' },
    ],
    assignments: [
      { id: 'asg-emb-1', title: 'Closed-Loop Wheel Velocity Controller', description: 'Read quadrature encoder ticks via timer interrupts and drive H-bridge PWM at 100 Hz.', completed: false },
    ],
    milestones: [
      { id: 'mil-emb-1', title: 'MCU publishing encoder odometry & accepting /cmd_vel via micro-ROS', completed: false },
    ],
    notes: '',
    referenceLinks: [],
    studyMinutes: 0,
  },
];

