import PlaceholderCard from '../components/PlaceholderCard.jsx'

function AIPlanner() {
  return (
    <>
      <PlaceholderCard title="Plan Preferences">
        <p>- Collect study hours, focus areas, preferred time windows.</p>
        <p>- Send payload to `/api/ai/plan` once backend is implemented.</p>
      </PlaceholderCard>
      <PlaceholderCard title="Generated Study Plan">
        <p>- Display AI response (summary, daily blocks, tips).</p>
        <p>- Allow saving plans to history and reusing older plans.</p>
      </PlaceholderCard>
    </>
  )
}

export default AIPlanner
