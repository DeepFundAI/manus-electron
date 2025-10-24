import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Header from '@/components/Header'
import { Input, Button } from 'antd'
import {ImageType, ReportType, SlideType, WebType, SpreadsheetType, VisualizeType, MoreType} from '@/icons/source-type-icons'
import { ScheduledTaskModal, ScheduledTaskListPanel } from '@/components/scheduled-task'
import { useScheduledTaskStore } from '@/stores/scheduled-task-store'
import { ModelConfigBar } from '@/components/ModelConfigBar'

export default function Home() {
    const [query, setQuery] = useState('')
    const router = useRouter()

    // Initialize scheduled task scheduler
    // Note: Use main process state flag to prevent duplicate initialization due to route switching
    useEffect(() => {
        const initScheduler = async () => {
            try {
                // Check if main process is already initialized
                if (typeof window !== 'undefined' && (window as any).api) {
                    const isInitialized = await (window as any).api.invoke('scheduler:is-initialized')

                    if (isInitialized) {
                        return
                    }

                    // Load and register all enabled tasks from storage
                    const { initializeScheduler } = useScheduledTaskStore.getState()
                    await initializeScheduler()

                    // Mark main process as initialized
                    await (window as any).api.invoke('scheduler:mark-initialized')
                }
            } catch (error) {
                console.error('[Home] Failed to initialize scheduler:', error)
            }
        }

        initScheduler()
    }, [])

    // Handle sending message
    const handleSendMessage = () => {
        if (query.trim()) {
            // Use sessionStorage to implicitly pass message
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('pendingMessage', query.trim())
            }
            // Directly navigate to main page without URL parameters
            router.push('/main')
        }
    }

    // Handle Enter key
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    const sourceTypes = [
        { icon: <ImageType/>, label: 'Image' },
        { icon: <ReportType/>, label: 'Report' },
        { icon: <SlideType/>, label: 'Slide' },
        { icon: <WebType/>, label: 'Web' },
        { icon: <SpreadsheetType/>, label: 'Spreadsheet' },
        { icon: <VisualizeType/>, label: 'Visualization' },
        { icon: <MoreType/>, label: 'More' }
    ]

    return (
        <>
            <Header />
            <div className='bg-main-view bg-origin-padding bg-no-repeat bg-cover h-[calc(100%_-_48px)] overflow-y-auto text-text-01-dark flex flex-col'>
                <div className='flex flex-col items-center pt-[130px] w-full h-full overflow-y-auto z-10'>
                    {/* Greeting */}
                    <div className='text-left leading-10 text-text-01-dark text-[28px] font-bold'>
                        <div>Hi, Buffett</div>
                        <p>I am Jarvis, a robot powered by llm. What can I do for you?</p>
                    </div>

                    {/* Unified Input Area: Model Config + Query Input */}
                    <div className='gradient-border w-[780px] mt-[30px]' style={{ height: 'auto' }}>
                        <div className='bg-tool-call rounded-xl w-full h-full'>
                            {/* Model Configuration Bar */}
                            <ModelConfigBar />

                            {/* Query input box */}
                            <div className='h-[160px] p-4'>
                                <Input.TextArea
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className='!h-full !bg-transparent !text-text-01-dark !placeholder-text-12-dark !py-3 !px-4 !border !border-solid'
                                    placeholder='Please enter your task'
                                    autoSize={false}
                                    style={{
                                        borderColor: 'rgba(255, 255, 255, 0.2)',
                                        borderWidth: '1px',
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                </div>

                {/* Bottom background decoration */}
                <div className='absolute bottom-0 w-full h-[212px] bg-main-view-footer bg-cover bg-no-repeat bg-center'></div>
            </div>

            {/* Scheduled task related components */}
            <ScheduledTaskModal />
            <ScheduledTaskListPanel />
        </>
    )
}