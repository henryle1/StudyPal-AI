import PlaceholderCard from '../components/PlaceholderCard.jsx'

function Tasks() {
  return (
    <>
      <PlaceholderCard title="Task List">
        <p>- Render tasks from `/api/tasks`.</p>
        <p>- Include filters, sorting, and progress indicators.</p>
      </PlaceholderCard>
      <PlaceholderCard title="Create / Edit Task">
        <p>- Build form with fields for title, description, due date, priority.</p>
        <p>- Wire up to POST/PUT endpoints when ready.</p>
      </PlaceholderCard>
    </>
  )
}

export default Tasks
