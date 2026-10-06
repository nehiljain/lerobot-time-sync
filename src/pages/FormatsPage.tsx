import { GotchaWall } from '../components/GotchaWall';
import { PageFooter, SeriesEyebrow, Topbar } from '../components/SiteChrome';
import { EpisodeLayouts } from '../formats/EpisodeLayouts';
import { EventsSnapshots } from '../formats/EventsSnapshots';
import { FormatMap } from '../formats/FormatMap';
import { HubStats } from '../formats/HubStats';
import { PathFinder } from '../formats/PathFinder';
import { WhoReadsWhat } from '../formats/WhoReadsWhat';
import { FORMATS_GOTCHAS, FORMATS_SOURCES } from '../formats/content';
import { pageHref } from '../site';

const NAV = [
  { id: 'events', label: 'Events vs snapshots' },
  { id: 'path', label: 'Find your path' },
  { id: 'episode', label: 'Where episode 7 lives' },
  { id: 'who', label: 'Who reads what' },
  { id: 'hub', label: 'What is out there' },
  { id: 'gotchas', label: 'What bites, by format' },
];

export default function FormatsPage() {
  return (
    <>
      <Topbar page="formats" sections={NAV} />
      <main id="top">
        <section className="hero">
          <div className="wrap-wide">
            <SeriesEyebrow page="formats" extra="the whole ecosystem on one map" />
            <h1 className="hero__title" style={{ maxWidth: '14ch' }}>
              Which robot data format, <em>when.</em>
            </h1>
            <p className="lede hero__dek">
              Logs record events. Training formats store snapshots. Everything in between is alignment and conversion. Click through it.
            </p>
          </div>
          <div className="wrap-wide hero__scope">
            <FormatMap />
          </div>
          <div className="wrap-wide gap-lg">
            <div className="rules">
              <div className="rule">
                <span className="rule__n mono">rule 1</span>
                <p>
                  <strong>Record in a log.</strong> ROS bags or MCAP keep every message with its own time. You can always resample later; you can't
                  un-resample.
                </p>
              </div>
              <div className="rule">
                <span className="rule__n mono">rule 2</span>
                <p>
                  <strong>Train from the format your trainer reads.</strong> LeRobot v3.0 for LeRobot, v2.x for openpi and GR00T, RLDS for OpenVLA
                  and Octo.
                </p>
              </div>
              <div className="rule">
                <span className="rule__n mono">rule 3</span>
                <p>
                  <strong>Alignment sits in between, and it's yours.</strong> No converter does it for you. That's{' '}
                  <a href={pageHref('lerobot')}>Part 1</a>.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="events">
          <div className="wrap prose">
            <div className="eyebrow">The divide</div>
            <h2>Events in, snapshots out</h2>
            <p className="gap-md">
              Every format sits on one side of a line. Logs keep each event when it happened. Training formats keep the state of everything at each
              tick.
            </p>
          </div>
          <div className="wrap-wide gap-lg">
            <EventsSnapshots />
          </div>
          <div className="wrap gap-lg">
            <figure className="pullquote">
              <blockquote>
                "We preferred to store these synchronous snapshots (i.e. the state of all the system at a moment t), rather than all events happening
                in the system (i.e. the new state of a sensor/motor and the moment t when it changed)."
              </blockquote>
              <figcaption>
                Caroline Pascal, LeRobot maintainer · <a href="https://github.com/huggingface/lerobot/issues/3513">issue #3513</a>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="section" id="path">
          <div className="wrap prose">
            <div className="eyebrow">Your route</div>
            <h2>Find your path</h2>
            <p className="gap-md">Two clicks. The route is a shortest path over real conversion tools; each hop links to its source.</p>
          </div>
          <div className="wrap-wide gap-lg">
            <PathFinder />
          </div>
        </section>

        <section className="section" id="episode">
          <div className="wrap prose">
            <div className="eyebrow">Layouts</div>
            <h2>Where episode 7 lives</h2>
            <p className="gap-md">The quickest way to understand a format: find one episode in it.</p>
          </div>
          <div className="wrap-wide gap-lg">
            <EpisodeLayouts />
          </div>
        </section>

        <section className="section" id="who">
          <div className="wrap prose">
            <div className="eyebrow">Trainers</div>
            <h2>Who reads what</h2>
          </div>
          <div className="wrap-wide gap-md">
            <WhoReadsWhat />
          </div>
        </section>

        <section className="section" id="hub">
          <div className="wrap prose">
            <div className="eyebrow">Numbers</div>
            <h2>What is out there</h2>
          </div>
          <div className="wrap-wide gap-md">
            <HubStats />
          </div>
        </section>

        <section className="section" id="gotchas">
          <div className="wrap prose">
            <div className="eyebrow">From the community</div>
            <h2>What bites, by format</h2>
            <p className="gap-md">
              From the issue trackers and docs of each project. Format-specific detail lives on the <a href={pageHref('lerobot')}>LeRobot</a>,{' '}
              <a href={pageHref('rosbag')}>ROS bag</a> and <a href={pageHref('mcap')}>MCAP</a> pages.
            </p>
          </div>
          <div className="wrap-wide gap-lg">
            <GotchaWall items={FORMATS_GOTCHAS} label="Filter format gotchas" />
          </div>
        </section>
      </main>
      <PageFooter
        page="formats"
        intro={<>Facts were checked on 2026-10-06 against each project's repository, docs and the Hugging Face API. Star counts and dataset numbers change; links go to the live pages.</>}
        sources={FORMATS_SOURCES}
      />
    </>
  );
}
