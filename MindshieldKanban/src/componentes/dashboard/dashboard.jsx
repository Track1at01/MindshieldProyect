import { useEffect, useMemo, useRef, useState } from 'react'
import './dashboard.css'

const statusColumns = ['Pendiente', 'En progreso', 'Finalizado']

const initialTasks = [
  {
    id: 1,
    title: 'Definir alcance del sprint',
    description: 'Reunión con stakeholders para priorizar objetivos y entregables.',
    priority: 'Alta',
    dueDate: '2026-07-24',
    assignee: 'Ana',
    labels: ['Discovery', 'Cliente'],
    status: 'Pendiente',
    comments: [{ id: 101, author: 'Mauro', text: 'Ya tengo el resumen listo.' }],
    activity: ['Tarea creada', 'Asignada a Ana']
  },
  {
    id: 2,
    title: 'Diseño del flujo onboarding',
    description: 'Mapear pantallas para la primera experiencia del usuario.',
    priority: 'Media',
    dueDate: '2026-07-28',
    assignee: 'Sofía',
    labels: ['UX', 'Diseño'],
    status: 'En progreso',
    comments: [{ id: 102, author: 'Sofía', text: 'Estoy ajustando el wireframe.' }],
    activity: ['Tarea creada', 'Movida a En progreso']
  },
  {
    id: 3,
    title: 'Entregar MVP a QA',
    description: 'Validar el flujo crítico y preparar retroalimentación.',
    priority: 'Baja',
    dueDate: '2026-07-30',
    assignee: 'Tomás',
    labels: ['QA', 'Entrega'],
    status: 'Finalizado',
    comments: [{ id: 103, author: 'Tomás', text: 'Listo para revisión final.' }],
    activity: ['Tarea creada', 'Marcada como Finalizada']
  }
]

const initialActivity = [
  { id: 1, text: 'Proyecto creado y listo para seguimiento', time: 'hace 5 min' },
  { id: 2, text: 'Tarea “Diseño del flujo onboarding” movida a En progreso', time: 'hace 18 min' }
]

function Dashboard() {
  const [project, setProject] = useState({
    name: 'MindShield Projects',
    description: 'Portal de creación y administración de proyectos con seguimiento visual.',
    owner: 'Equipo Producto',
    target: 'Q3 2026'
  })
  const [tasks, setTasks] = useState(initialTasks)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('Todos')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [selectedTaskId, setSelectedTaskId] = useState(initialTasks[0].id)
  const [commentText, setCommentText] = useState('')
  const [activityFeed, setActivityFeed] = useState(initialActivity)
  const [syncStatus, setSyncStatus] = useState('Conectando sincronización...')
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'Media',
    dueDate: '',
    assignee: '',
    labels: '',
    status: 'Pendiente'
  })

  const socketRef = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => {
    let socket = null
    let channel = null

    try {
      channel = new BroadcastChannel('mindshield-project-board')
      channel.onmessage = (event) => {
        if (event.data?.type === 'task-update') {
          setTasks(event.data.tasks)
        }
        if (event.data?.type === 'activity-update') {
          setActivityFeed(event.data.activity)
        }
      }
    } catch {
      channel = null
    }

    try {
      socket = new WebSocket('wss://ws.postman-echo.com/raw')
      socket.onopen = () => setSyncStatus('WebSocket activo · sincronización en vivo')
      socket.onerror = () => setSyncStatus('Modo local · WebSocket no disponible')
      socket.onclose = () => setSyncStatus('Modo local · conexión cerrada')
    } catch {
      socket = null
      setSyncStatus('Modo local · WebSocket no disponible')
    }

    socketRef.current = socket
    channelRef.current = channel

    return () => {
      socket?.close()
      channel?.close()
    }
  }, [])

  const broadcastUpdate = (nextTasks, nextActivity) => {
    setTasks(nextTasks)
    if (nextActivity) {
      setActivityFeed(nextActivity)
    }

    const payload = { type: 'task-update', tasks: nextTasks }
    const activityPayload = { type: 'activity-update', activity: nextActivity }

    channelRef.current?.postMessage(payload)
    channelRef.current?.postMessage(activityPayload)

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload))
    }
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = [task.title, task.description, task.assignee, task.labels.join(' ')].join(' ').toLowerCase().includes(search.toLowerCase())
      const matchesPriority = priorityFilter === 'Todos' || task.priority === priorityFilter
      const matchesStatus = statusFilter === 'Todos' || task.status === statusFilter
      return matchesSearch && matchesPriority && matchesStatus
    })
  }, [tasks, search, priorityFilter, statusFilter])

  const selectedTask = useMemo(() => {
    return tasks.find((task) => task.id === selectedTaskId) || null
  }, [selectedTaskId, tasks])

  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((task) => task.status === 'Finalizado').length
    const inProgress = tasks.filter((task) => task.status === 'En progreso').length
    const pending = tasks.filter((task) => task.status === 'Pendiente').length
    return { total, done, inProgress, pending }
  }, [tasks])

  const handleTaskSubmit = (event) => {
    event.preventDefault()

    if (!form.title.trim()) {
      return
    }

    const newTask = {
      id: Date.now(),
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      dueDate: form.dueDate,
      assignee: form.assignee.trim() || 'Sin asignar',
      labels: form.labels.split(',').map((item) => item.trim()).filter(Boolean),
      status: form.status,
      comments: [],
      activity: ['Tarea creada']
    }

    const nextTasks = [newTask, ...tasks]
    const nextActivity = [
      { id: Date.now(), text: `Tarea “${newTask.title}” creada`, time: 'ahora' },
      ...activityFeed.slice(0, 4)
    ]

    setSelectedTaskId(newTask.id)
    setForm({ title: '', description: '', priority: 'Media', dueDate: '', assignee: '', labels: '', status: 'Pendiente' })
    broadcastUpdate(nextTasks, nextActivity)
  }

  const moveTask = (taskId, status) => {
    const nextTasks = tasks.map((task) => {
      if (task.id !== taskId) {
        return task
      }
      const updatedTask = { ...task, status }
      updatedTask.activity = [...updatedTask.activity, `Movida a ${status}`]
      return updatedTask
    })

    const taskName = tasks.find((task) => task.id === taskId)?.title || 'Tarea'
    const nextActivity = [
      { id: Date.now(), text: `Tarea “${taskName}” movida a ${status}`, time: 'ahora' },
      ...activityFeed.slice(0, 4)
    ]

    broadcastUpdate(nextTasks, nextActivity)
  }

  const handleDrop = (event, status) => {
    event.preventDefault()
    const taskId = Number(event.dataTransfer.getData('text/plain'))
    if (!Number.isNaN(taskId)) {
      moveTask(taskId, status)
    }
  }

  const handleAddComment = (event) => {
    event.preventDefault()

    if (!selectedTask || !commentText.trim()) {
      return
    }

    const nextTasks = tasks.map((task) => {
      if (task.id !== selectedTask.id) {
        return task
      }
      return {
        ...task,
        comments: [...task.comments, { id: Date.now(), author: 'Tú', text: commentText.trim() }],
        activity: [...task.activity, 'Nuevo comentario agregado']
      }
    })

    const nextActivity = [
      { id: Date.now(), text: `Nuevo comentario en “${selectedTask.title}”`, time: 'ahora' },
      ...activityFeed.slice(0, 4)
    ]

    setCommentText('')
    broadcastUpdate(nextTasks, nextActivity)
  }

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Creación y administración de proyectos</p>
          <h1>{project.name}</h1>
          <p className="header-copy">{project.description}</p>
        </div>
        <div className="header-actions">
          <div className={`sync-pill ${syncStatus.includes('WebSocket') ? 'active' : 'local'}`}>{syncStatus}</div>
          <button className="ghost-btn" type="button">+ Nuevo proyecto</button>
        </div>
      </header>

      <section className="overview-grid">
        <article className="overview-card accent">
          <span>Progreso del proyecto</span>
          <strong>{Math.round((stats.done / Math.max(stats.total, 1)) * 100)}%</strong>
          <small>{stats.done} de {stats.total} tareas cerradas</small>
        </article>
        <article className="overview-card">
          <span>Pendientes</span>
          <strong>{stats.pending}</strong>
          <small>Esperando revisión</small>
        </article>
        <article className="overview-card">
          <span>En progreso</span>
          <strong>{stats.inProgress}</strong>
          <small>Actividades en marcha</small>
        </article>
        <article className="overview-card">
          <span>Finalizadas</span>
          <strong>{stats.done}</strong>
          <small>Listas para entrega</small>
        </article>
      </section>

      <section className="workspace-grid">
        <div className="board-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Tablero</p>
              <h2>Gestión visual del trabajo</h2>
            </div>
            <div className="toolbar">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar tareas"
              />
              <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                <option value="Todos">Todas las prioridades</option>
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="Todos">Todos los estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En progreso">En progreso</option>
                <option value="Finalizado">Finalizado</option>
              </select>
            </div>
          </div>

          <div className="board-columns">
            {statusColumns.map((status) => {
              const columnTasks = filteredTasks.filter((task) => task.status === status)
              return (
                <div
                  key={status}
                  className="column"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, status)}
                >
                  <div className="column-header">
                    <h3>{status}</h3>
                    <span>{columnTasks.length}</span>
                  </div>
                  <div className="task-list">
                    {columnTasks.map((task) => (
                      <article
                        key={task.id}
                        className={`task-card ${selectedTaskId === task.id ? 'selected' : ''}`}
                        draggable
                        onDragStart={(event) => event.dataTransfer.setData('text/plain', String(task.id))}
                        onClick={() => setSelectedTaskId(task.id)}
                      >
                        <div className="task-top">
                          <p className="task-title">{task.title}</p>
                          <span className={`priority-pill ${task.priority.toLowerCase()}`}>{task.priority}</span>
                        </div>
                        <p className="task-description">{task.description}</p>
                        <div className="task-meta">
                          <span>📅 {task.dueDate || 'Sin fecha'}</span>
                          <span>👤 {task.assignee}</span>
                        </div>
                        <div className="label-row">
                          {task.labels.map((label) => (
                            <span key={label} className="label-pill">{label}</span>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <aside className="sidebar">
          <div className="card">
            <div className="card-title-row">
              <div>
                <p className="eyebrow">Proyecto</p>
                <h3>Información del proyecto</h3>
              </div>
              <span className="chip">{project.target}</span>
            </div>
            <label>
              Nombre
              <input value={project.name} onChange={(event) => setProject({ ...project, name: event.target.value })} />
            </label>
            <label>
              Descripción
              <textarea value={project.description} onChange={(event) => setProject({ ...project, description: event.target.value })} />
            </label>
            <div className="project-meta">
              <div>
                <strong>Responsable</strong>
                <p>{project.owner}</p>
              </div>
              <div>
                <strong>Meta</strong>
                <p>{project.target}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title-row">
              <div>
                <p className="eyebrow">Crear</p>
                <h3>Nueva tarea</h3>
              </div>
            </div>
            <form className="task-form" onSubmit={handleTaskSubmit}>
              <label>
                Título
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ej. Diseño de la landing" />
              </label>
              <label>
                Descripción
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe el objetivo" />
              </label>
              <div className="form-row">
                <label>
                  Prioridad
                  <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </label>
                <label>
                  Estado
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                    <option value="Pendiente">Pendiente</option>
                    <option value="En progreso">En progreso</option>
                    <option value="Finalizado">Finalizado</option>
                  </select>
                </label>
              </div>
              <div className="form-row">
                <label>
                  Fecha límite
                  <input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
                </label>
                <label>
                  Responsable
                  <input value={form.assignee} onChange={(event) => setForm({ ...form, assignee: event.target.value })} placeholder="Nombre" />
                </label>
              </div>
              <label>
                Etiquetas
                <input value={form.labels} onChange={(event) => setForm({ ...form, labels: event.target.value })} placeholder="UX, Diseño, Sprint" />
              </label>
              <button className="primary-btn" type="submit">Agregar tarea</button>
            </form>
          </div>

          <div className="card">
            <div className="card-title-row">
              <div>
                <p className="eyebrow">Detalle</p>
                <h3>{selectedTask ? selectedTask.title : 'Selecciona una tarea'}</h3>
              </div>
            </div>
            {selectedTask ? (
              <>
                <p className="detail-copy">{selectedTask.description}</p>
                <div className="detail-meta">
                  <span><strong>Prioridad:</strong> {selectedTask.priority}</span>
                  <span><strong>Fecha:</strong> {selectedTask.dueDate || 'Sin fecha'}</span>
                  <span><strong>Responsable:</strong> {selectedTask.assignee}</span>
                </div>
                <div className="detail-section">
                  <h4>Comentarios</h4>
                  <form className="comment-form" onSubmit={handleAddComment}>
                    <textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Escribe un comentario" />
                    <button className="secondary-btn" type="submit">Guardar comentario</button>
                  </form>
                  <div className="comment-list">
                    {selectedTask.comments.map((comment) => (
                      <div key={comment.id} className="comment-item">
                        <strong>{comment.author}</strong>
                        <p>{comment.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="detail-section">
                  <h4>Historial de actividad</h4>
                  <ul className="activity-list">
                    {selectedTask.activity.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <p className="detail-copy">Haz clic en una tarea para ver su detalle, comentarios y actividad.</p>
            )}
          </div>

          <div className="card">
            <div className="card-title-row">
              <div>
                <p className="eyebrow">Actividad</p>
                <h3>Historial reciente</h3>
              </div>
            </div>
            <ul className="activity-list"> 
              {activityFeed.map((item) => (
                <li key={item.id}>
                  <span>{item.text}</span>
                  <small>{item.time}</small>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
    </div>
  )
}

export default Dashboard
