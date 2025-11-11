import PlaceholderCard from '../components/PlaceholderCard.jsx'
import WeeklySnapshot from '../components/WeeklySnapshot.jsx'

function Dashboard() {
  return (
    <>
      <WeeklySnapshot />
      <PlaceholderCard title="Today’s Focus">
        <p>- Surface top-priority tasks due soon.</p>
        <p>- Provide quick actions such as “Mark complete”.</p>
      </PlaceholderCard>
    </>
  )
}

export default Dashboard
