import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

export default function TaskManager() {
    const { user, signOut } = useAuth()
    const [tasks, setTasks] = useState([])
    const [newTask, setNewTask] = useState({ title: '', description: '' })
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(null)
    const [filter, setFilter] = useState('all')

    useEffect(() => {
        fetchTasks()
        const channel = supabase
            .channel('tasks')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
                fetchTasks()
            })
            .subscribe()
        return () => supabase.removeChannel(channel)
    }, [])

    const fetchTasks = async () => {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('position', { ascending: true }) // Sort by position
            .order('created_at', { ascending: false })

        if (!error) setTasks(data)
        setLoading(false)
    }

    const addTask = async (e) => {
        e.preventDefault()
        if (!newTask.title.trim()) return
        setUpdating('adding')

        // Find highest position to add at the end
        const lastPos = tasks.length > 0 ? Math.max(...tasks.map(t => t.position || 0)) : 0

        const { error } = await supabase.from('tasks').insert([{
            ...newTask,
            user_id: user.id,
            position: lastPos + 1
        }])

        if (!error) setNewTask({ title: '', description: '' })
        setUpdating(null)
    }

    const toggleTask = async (task) => {
        setUpdating(task.id)
        await supabase
            .from('tasks')
            .update({ completed: !task.completed })
            .eq('id', task.id)
        setUpdating(null)
    }

    const deleteTask = async (id) => {
        setUpdating(id)
        await supabase.from('tasks').delete().eq('id', id)
        setUpdating(null)
    }

    const onDragEnd = async (result) => {
        if (!result.destination) return

        const items = Array.from(tasks)
        const [reorderedItem] = items.splice(result.source.index, 1)
        items.splice(result.destination.index, 0, reorderedItem)

        // Update state immediately for UX
        setTasks(items)

        // Update positions in Supabase
        // To be efficient, we only update positions for all items
        const updates = items.map((task, index) => ({
            id: task.id,
            position: index,
            user_id: user.id // Supabase batch update usually needs all required fields or handles it based on ID
        }))

        // Use a Supabase upsert or sequential updates
        // For simplicity in this demo, we'll do sequential updates or a single call if Supabase supports it well
        for (let i = 0; i < items.length; i++) {
            await supabase
                .from('tasks')
                .update({ position: i })
                .eq('id', items[i].id)
        }
    }

    const filteredTasks = tasks.filter(task => {
        if (filter === 'pending') return !task.completed
        if (filter === 'completed') return task.completed
        return true
    })

    const stats = {
        total: tasks.length,
        completed: tasks.filter(t => t.completed).length,
        pending: tasks.filter(t => !t.completed).length
    }

    return (
        <div className="dashboard-container">
            <header className="header-nav">
                <div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: '700' }}>CloudTasks</h1>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</p>
                </div>
                <button
                    onClick={signOut}
                    style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--danger)',
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.2)'}
                    onMouseLeave={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                >
                    Cerrar sesión
                </button>
            </header>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stats.total}</p>
                </div>
                <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pendientes</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--warning)' }}>{stats.pending}</p>
                </div>
                <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completas</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success)' }}>{stats.completed}</p>
                </div>
            </div>

            {/* Add Task */}
            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2.5rem' }}>
                <form onSubmit={addTask}>
                    <input
                        placeholder="Título de la tarea..."
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        style={{ marginBottom: '1rem' }}
                        required
                    />
                    <textarea
                        placeholder="Notas (opcional)"
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        style={{
                            width: '100%',
                            background: 'var(--input-bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            color: 'white',
                            fontSize: '0.875rem',
                            minHeight: '80px',
                            fontFamily: 'inherit',
                            marginBottom: '1rem'
                        }}
                    />
                    <button type="submit" className="btn-primary" disabled={updating === 'adding'}>
                        {updating === 'adding' ? 'Guardando...' : 'Añadir Tarea'}
                    </button>
                </form>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {['all', 'pending', 'completed'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                            padding: '0.4rem 1rem',
                            borderRadius: '6px',
                            fontSize: '0.8125rem',
                            fontWeight: '500',
                            background: filter === f ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: filter === f ? 'white' : 'var(--text-muted)',
                            border: '1px solid',
                            borderColor: filter === f ? 'var(--primary)' : 'var(--border)',
                            transition: 'all 0.2s'
                        }}
                    >
                        {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : 'Completas'}
                    </button>
                ))}
            </div>

            {/* List with Drag and Drop */}
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="tasks-list">
                    {(provided) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                        >
                            {loading ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Sincronizando...</p>
                            ) : filteredTasks.length === 0 ? (
                                <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    No hay tareas pendientes.
                                </div>
                            ) : (
                                filteredTasks.map((task, index) => (
                                    <Draggable key={task.id} draggableId={task.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className="glass-card"
                                                style={{
                                                    padding: '1rem 1.25rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '1.25rem',
                                                    marginBottom: 0,
                                                    opacity: updating === task.id ? 0.6 : 1,
                                                    cursor: 'grab',
                                                    background: snapshot.isDragging ? 'var(--border)' : 'var(--card-bg)',
                                                    boxShadow: snapshot.isDragging ? '0 10px 15px -3px rgba(0, 0, 0, 0.4)' : 'none',
                                                    ...provided.draggableProps.style
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={task.completed}
                                                    onChange={() => toggleTask(task)}
                                                    onClick={(e) => e.stopPropagation()} // Prevent drag start when clicking checkbox
                                                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                                />
                                                <div style={{ flex: 1 }}>
                                                    <h3 style={{ fontSize: '0.9375rem', fontWeight: '500', textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--text-muted)' : 'var(--text-main)' }}>
                                                        {task.title}
                                                    </h3>
                                                    {task.description && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{task.description}</p>}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation() // Prevent drag start
                                                        deleteTask(task.id)
                                                    }}
                                                    style={{ background: 'transparent', color: 'var(--text-muted)', opacity: 0.5, fontSize: '1rem', fontWeight: 'bold' }}
                                                    onMouseEnter={(e) => e.target.style.opacity = 1}
                                                    onMouseLeave={(e) => e.target.style.opacity = 0.5}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                    </Draggable>
                                ))
                            )}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2rem' }}>
                💡 Arrastra las tareas para cambiar su orden
            </p>
        </div>
    )
}
