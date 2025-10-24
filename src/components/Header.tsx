import React from 'react'
import { Button } from 'antd'
import { HistoryOutlined } from '@ant-design/icons'
import { useRouter } from 'next/router'
import { HistoryPanel } from '@/components/HistoryPanel'
import { useHistoryStore } from '@/stores/historyStore'
import { useScheduledTaskStore } from '@/stores/scheduled-task-store'
import { ScheduledTaskIcon } from '@/icons/scheduled-task-icons'

export default function Header() {
  const router = useRouter()
  const { taskId, executionId } = router.query

  // Check if in scheduled task detail mode
  const isTaskDetailMode = !!taskId && !!executionId

  // Using Zustand store, as simple as Pinia!
  const { showHistoryPanel, setShowHistoryPanel, selectHistoryTask, terminateCurrentTaskFn } = useHistoryStore()
  const { setShowListPanel } = useScheduledTaskStore()

  const goback = async () => {
    router.push('/home')
  }

  const onSelectTask = (task: any) => {
    // Use store to select history task
    selectHistoryTask(task);

    // If not on main page, navigate to it
    if (router.pathname !== '/main') {
      router.push('/main');
    }
  }

  return (
    <div className=' flex justify-between items-center h-12 w-full px-7 bg-header text-text-01-dark' style={{
            WebkitAppRegion: 'drag'
          } as React.CSSProperties}>
      {/* Don't show back button in scheduled task mode */}
      {!isTaskDetailMode && (
        <div
          style={{
            WebkitAppRegion: 'no-drag'
          } as React.CSSProperties}
          onClick={() => goback()}
          className='cursor-pointer ml-8 flex items-center'
        >
          <span className='text-3xl font-bold  tracking-normal hover:scale-105 transition-all duration-300 drop-shadow-2xl relative font-["Berkshire_Swash",_cursive]'>
            DeepFundAI
            <span className='absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-600/20 to-cyan-500/20 blur-sm -z-10'></span>
          </span>
        </div>
      )}
      {isTaskDetailMode && (
        <div className='flex items-center gap-2 ml-8 px-3 py-1 bg-blue-500/20 rounded-md border border-blue-500/50'>
          <span className='text-blue-400 text-xs font-medium'>Scheduled Task</span>
          {taskId && (
            <span className='text-blue-300 text-xs opacity-70'>#{String(taskId).slice(-6)}</span>
          )}
        </div>
      )}
      <div className='flex justify-center items-center gap-4'>
        {/* Create task button - only show in home page */}
        {!isTaskDetailMode && (router.pathname === '/home' || router.pathname === '/') && (
          <Button
            type="text"
            icon={<ScheduledTaskIcon />}
            size="small"
            onClick={() => setShowListPanel(true)}
            className='!text-text-01-dark hover:!bg-blue-500/10'
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            Scheduled Tasks
          </Button>
        )}
        <Button
          type="text"
          icon={<HistoryOutlined />}
          size="small"
          onClick={() => setShowHistoryPanel(true)}
          className='!text-text-01-dark'
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {isTaskDetailMode ? 'Execution History' : 'History'}
        </Button>
      </div>

      {/* Global history task panel - passing scheduled task info */}
      <HistoryPanel
        visible={showHistoryPanel}
        onClose={() => setShowHistoryPanel(false)}
        onSelectTask={onSelectTask}
        currentTaskId=""
        isTaskDetailMode={isTaskDetailMode}
        scheduledTaskId={taskId as string}
      />
    </div>
  )
}
