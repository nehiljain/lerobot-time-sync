export function ShortAnswer() {
  return (
    <div className="answer" role="region" aria-label="Short answer">
      <div className="answer__col">
        <h3>The format promises</h3>
        <ul className="list">
          <li>One row per tick. Every row is exactly 1/fps after the last.</li>
          <li>Each video frame matches its row's timestamp, within 0.1 ms.</li>
          <li>Time windows by index: "the next 50 actions" is 50 rows.</li>
        </ul>
      </div>
      <div className="answer__col answer__col--assumes">
        <h3>The format assumes</h3>
        <ul className="list">
          <li>The image, state and action in a row happened at the same moment.</li>
          <li>Every sensor was already brought to one clock and one rate.</li>
          <li>Gaps and dropped frames were already handled.</li>
        </ul>
      </div>
      <p className="answer__foot">
        <strong>Time sync is the step that makes the assumptions true.</strong> LeRobot's own recorder does a rough
        version while it records. Logs from anywhere else, like a robot fleet writing ROS bags, need a real one. That is
        the box on the slide.
      </p>
    </div>
  );
}
