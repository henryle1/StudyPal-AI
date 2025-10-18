function PlaceholderCard({ title, children }) {
  return (
    <section className="placeholder-card">
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <p style={{ marginBottom: '1rem', color: '#64748b' }}>
        This area is ready for your implementation. Replace the notes below with
        live content.
      </p>
      <div style={{ display: 'grid', gap: '0.5rem' }}>{children}</div>
    </section>
  )
}

export default PlaceholderCard
