import PlaceholderCard from '../components/PlaceholderCard.jsx'

function Dashboard() {
  return (
    <>
      <PlaceholderCard title="Weekly Snapshot">
        <p>- Hook up stats from `/api/stats/overview`.</p>
        <p>- Replace with cards showing completion rate, streak, XP.</p>
      </PlaceholderCard>
      <PlaceholderCard title="Today’s Focus">
        <p>- Surface top-priority tasks due soon.</p>
        <p>- Provide quick actions such as “Mark complete”.</p>
      </PlaceholderCard>
    </>
  )
}

export default Dashboard
