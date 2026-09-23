import { useCallback, useState } from 'react';
import Home from './pages/Home';
import Drill from './pages/Drill';
import Quiz from './pages/Quiz';
import Weak from './pages/Weak';
import Today from './pages/Today';
import { TabBar, type Tab } from './components/TabBar';
import { useReports } from './hooks/useReports';
import { useRatings, loadRatings } from './hooks/useRatings';
import { useCheckedCards } from './hooks/useCheckedCards';
import { loadQuizStats } from './hooks/useQuizStats';
import { buildTodayQueue, type SessionItem } from './lib/recommend';
import cardsData from './data/cards.json';
import questionsData from './data/questions.json';
import type { Card } from './types/Card';
import type { QuestionTemplate } from './types/Question';

const builtinCards = cardsData as Card[];
const templates = questionsData as QuestionTemplate[];

function App() {
  const [tab, setTab] = useState<Tab>('cards');
  const [focusCardId, setFocusCardId] = useState<number | null>(null);
  const [focusTplId, setFocusTplId] = useState<string | null>(null);
  const [session, setSession] = useState<SessionItem[] | null>(null);

  const { reports, toggle: toggleReport, isReported } = useReports();
  const { getRating, rate } = useRatings();
  const { checkedIds, toggleChecked } = useCheckedCards();

  const startToday = useCallback(() => {
    setSession(
      buildTodayQueue(builtinCards, templates, loadRatings(), loadQuizStats()),
    );
  }, []);

  const openCard = useCallback((id: number) => {
    setFocusCardId(id);
    setTab('cards');
  }, []);

  const retryTemplate = useCallback((tplId: string) => {
    setFocusTplId(tplId);
    setTab('quiz');
  }, []);

  if (session) {
    return (
      <Today
        items={session}
        getRating={getRating}
        rate={rate}
        checkedIds={checkedIds}
        onToggleCheck={toggleChecked}
        isReported={isReported}
        onToggleReport={toggleReport}
        onClose={() => setSession(null)}
      />
    );
  }

  return (
    <>
      {tab === 'cards' && (
        <Home
          focusCardId={focusCardId}
          onConsumeFocus={() => setFocusCardId(null)}
          onStartToday={startToday}
          isReported={isReported}
          onToggleReport={toggleReport}
        />
      )}
      {tab === 'drill' && (
        <Drill isReported={isReported} onToggleReport={toggleReport} />
      )}
      {tab === 'quiz' && (
        <Quiz
          focusTplId={focusTplId}
          onConsumeFocus={() => setFocusTplId(null)}
          isReported={isReported}
          onToggleReport={toggleReport}
        />
      )}
      {tab === 'weak' && (
        <Weak
          reports={reports}
          onRetryTemplate={retryTemplate}
          onOpenCard={openCard}
          onStartToday={startToday}
        />
      )}
      <TabBar tab={tab} onChange={setTab} />
    </>
  );
}

export default App;
