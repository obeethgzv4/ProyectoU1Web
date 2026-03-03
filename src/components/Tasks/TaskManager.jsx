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
    const [editingTask, setEditingTask] = useState(null) // { id, title, description }

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

    const startEditing = (task) => {
        setEditingTask({ ...task })
    }

    const saveEdit = async () => {
        if (!editingTask.title.trim()) return
        setUpdating(editingTask.id)
        const { error } = await supabase
            .from('tasks')
            .update({
                title: editingTask.title,
                description: editingTask.description
            })
            .eq('id', editingTask.id)

        if (!error) setEditingTask(null)
        setUpdating(null)
    }

    const cancelEditing = () => {
        setEditingTask(null)
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
            <div className="container" style={{ maxWidth: '1200px' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', padding: '0 1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2.5rem' }} className="text-glow">CloudTasks</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Bienvenido de nuevo, {user.email.split('@')[0]}</p>
                    </div>
                    <button onClick={signOut} className="glass" style={{ padding: '0.75rem 1.5rem', color: 'var(--danger)', borderRadius: '12px', fontWeight: '600', fontSize: '0.8125rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        Cerrar sesión
                    </button>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 2fr', gap: '2.5rem', alignItems: 'start' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="glass" style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ gridColumn: 'span 2', marginBottom: '1rem' }}>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.1em' }}>ESTADO GLOBAL</p>
                                <p style={{ fontSize: '2.5rem', fontWeight: '800' }}>{stats.pending} <span style={{ fontSize: '0.875rem', fontWeight: '400', color: 'var(--text-secondary)' }}>pendientes</span></p>
                            </div>
                            <div className="glass" style={{ padding: '1rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>TOTAL</p>
                                <p style={{ fontSize: '1.25rem', fontWeight: '700' }}>{stats.total}</p>
                            </div>
                            <div className="glass" style={{ padding: '1rem', textAlign: 'center', background: 'rgba(16, 185, 129, 0.05)' }}>
                                <p style={{ fontSize: '0.65rem', color: 'var(--success)' }}>ÉXITO</p>
                                <p style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--success)' }}>{stats.completed}</p>
                            </div>
                        </div>

                        <div className="glass" style={{ padding: '2rem' }}>
                            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '600' }}>Nueva Tarea</h3>
                            <form onSubmit={addTask}>
                                <div className="floating-input-group">
                                    <input placeholder="¿Qué hay que hacer?" className="floating-input" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} required />
                                </div>
                                <div className="floating-input-group">
                                    <textarea placeholder="Detalles adicionales..." className="floating-input" style={{ minHeight: '120px', resize: 'none' }} value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} />
                                </div>
                                <button type="submit" className="btn-premium" disabled={updating === 'adding'}>
                                    {updating === 'adding' ? 'Creando...' : 'Añadir a la lista'}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="glass" style={{ padding: '2rem', minHeight: '600px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Tus Tareas</h3>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {['all', 'pending', 'completed'].map(f => (
                                    <button key={f} onClick={() => setFilter(f)} style={{ padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '600', background: filter === f ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: filter === f ? 'white' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                                        {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : 'Completas'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="tasks-list">
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef}>
                                        {loading ? <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Sincronizando tareas...</p> :
                                            filteredTasks.length === 0 ? (
                                                <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-secondary)' }}>
                                                    <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✨ Todo despejado</p>
                                                </div>
                                            ) : (
                                                filteredTasks.map((task, index) => (
                                                    <Draggable key={task.id} draggableId={task.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                                                className="glass task-card"
                                                                style={{
                                                                    ...provided.draggableProps.style,
                                                                    marginBottom: '1rem',
                                                                    opacity: updating === task.id ? 0.5 : 1,
                                                                    background: snapshot.isDragging ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                                                                    border: snapshot.isDragging ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                                                                    flexDirection: editingTask?.id === task.id ? 'column' : 'row',
                                                                    alignItems: editingTask?.id === task.id ? 'stretch' : 'center'
                                                                }}
                                                            >
                                                                {editingTask?.id === task.id ? (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                                                                        <input
                                                                            className="floating-input"
                                                                            value={editingTask.title}
                                                                            onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                                                                            style={{ padding: '0.75rem', fontSize: '1rem' }}
                                                                        />
                                                                        <textarea
                                                                            className="floating-input"
                                                                            value={editingTask.description}
                                                                            onChange={e => setEditingTask({ ...editingTask, description: e.target.value })}
                                                                            style={{ minHeight: '80px', padding: '0.75rem', fontSize: '0.875rem' }}
                                                                        />
                                                                        <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
                                                                            <button onClick={cancelEditing} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'white', cursor: 'pointer' }}>Cancelar</button>
                                                                            <button onClick={saveEdit} style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: '600', cursor: 'pointer' }}>Guardar</button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <div className={`checkbox-custom ${task.completed ? 'checked' : ''}`} onClick={() => toggleTask(task)}>
                                                                            {task.completed && <span style={{ color: 'white', fontSize: '10px' }}>L</span>}
                                                                        </div>
                                                                        <div style={{ flex: 1 }} onClick={() => startEditing(task)}>
                                                                            <h4 style={{ fontSize: '1.1rem', fontWeight: '500', textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--text-secondary)' : 'white' }}>{task.title}</h4>
                                                                            {task.description && <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{task.description}</p>}
                                                                        </div>
                                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                            <button onClick={() => startEditing(task)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.2)', fontSize: '0.875rem', border: 'none', cursor: 'pointer' }} onMouseEnter={e => e.target.style.color = 'var(--accent-blue)'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.2)'}>✏️</button>
                                                                            <button onClick={() => deleteTask(task.id)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.2)', fontSize: '1rem', border: 'none', cursor: 'pointer' }} onMouseEnter={e => e.target.style.color = 'var(--danger)'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.2)'}>✕</button>
                                                                        </div>
                                                                    </>
                                                                )}
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
                    </div>
                </div>
            </div>
        </>
    )
}
