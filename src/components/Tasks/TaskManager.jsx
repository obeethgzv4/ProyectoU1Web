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
            .order('position', { ascending: true })
        if (!error) setTasks(data)
        setLoading(false)
    }

    const addTask = async (e) => {
        e.preventDefault()
        if (!newTask.title.trim()) return
        setUpdating('adding')
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
        await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id)
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
        setTasks(items)
        for (let i = 0; i < items.length; i++) {
            await supabase.from('tasks').update({ position: i }).eq('id', items[i].id)
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
        <>
            <div className="mesh-bg"></div>
            <div className="container">
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', padding: '0 1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem' }} className="text-glow">CloudTasks</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{user.email}</p>
                    </div>
                    <button onClick={signOut} className="glass" style={{ padding: '0.75rem 1.5rem', color: 'var(--danger)', borderRadius: '12px', fontWeight: '600', fontSize: '0.8125rem' }}>
                        Cerrar sesión
                    </button>
                </header>

                {/* Bento Grid Stats */}
                <div className="bento-grid">
                    <div className="glass bento-item bento-main" style={{ alignItems: 'flex-start' }}>
                        <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>SITUACIÓN ACTUAL</h3>
                        <p style={{ fontSize: '3.5rem', fontWeight: '800' }}>{stats.pending} <span style={{ fontSize: '1rem', fontWeight: '400', color: 'var(--text-secondary)' }}>tareas pendientes</span></p>
                    </div>
                    <div className="glass bento-item">
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>TOTALES</p>
                        <p style={{ fontSize: '2rem', fontWeight: '700' }}>{stats.total}</p>
                    </div>
                    <div className="glass bento-item">
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>COMPLETADAS</p>
                        <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--success)' }}>{stats.completed}</p>
                    </div>
                    <div className="glass bento-item" style={{ gridColumn: 'span 2', flexDirection: 'row', gap: '1rem' }}>
                        <button onClick={() => setFilter('all')} style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: filter === 'all' ? 'var(--primary)' : 'transparent', color: filter === 'all' ? 'white' : 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}>Todas</button>
                        <button onClick={() => setFilter('pending')} style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: filter === 'pending' ? 'var(--primary)' : 'transparent', color: filter === 'pending' ? 'white' : 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}>Pendientes</button>
                        <button onClick={() => setFilter('completed')} style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: filter === 'completed' ? 'var(--primary)' : 'transparent', color: filter === 'completed' ? 'white' : 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}>Terminadas</button>
                    </div>
                </div>

                {/* Action Area */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
                    <div className="glass" style={{ padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Nueva Tarea</h3>
                        <form onSubmit={addTask}>
                            <div className="floating-input-group">
                                <input placeholder="Título" className="floating-input" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} required />
                            </div>
                            <div className="floating-input-group">
                                <textarea placeholder="Descripción" className="floating-input" style={{ minHeight: '100px', resize: 'none' }} value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} />
                            </div>
                            <button type="submit" className="btn-premium" disabled={updating === 'adding'}>Añadir</button>
                        </form>
                    </div>

                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="tasks-list">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef}>
                                    {loading ? <p style={{ textAlign: 'center' }}>Cargando...</p> :
                                        filteredTasks.map((task, index) => (
                                            <Draggable key={task.id} draggableId={task.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                                        className="glass task-card"
                                                        style={{
                                                            ...provided.draggableProps.style,
                                                            opacity: updating === task.id ? 0.5 : 1,
                                                            background: snapshot.isDragging ? 'rgba(255,255,255,0.1)' : 'var(--glass-bg)'
                                                        }}
                                                    >
                                                        <div className={`checkbox-custom ${task.completed ? 'checked' : ''}`} onClick={() => toggleTask(task)}>
                                                            {task.completed && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <h4 style={{ fontSize: '1.125rem', textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--text-secondary)' : 'white' }}>{task.title}</h4>
                                                            {task.description && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{task.description}</p>}
                                                        </div>
                                                        <button onClick={() => deleteTask(task.id)} style={{ background: 'transparent', color: 'var(--text-secondary)', fontSize: '1.25rem', padding: '0.5rem' }}>✕</button>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </div>
            </div>
        </>
    )
}
