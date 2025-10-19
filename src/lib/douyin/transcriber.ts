import { httpClient } from '../../utils/http';

export async function extractAudioText(
  videoUrl: string,
  apiKey: string,
  model: string = 'paraformer-v2'
): Promise<string> {
  try {
    console.log('Starting audio text extraction, using video URL for direct transcription...');

    // Use async transcription API
    const transcriptText = await callDashscopeAsyncAPI(videoUrl, apiKey, model);

    console.log('Audio text extraction completed');
    return transcriptText;

  } catch (error) {
    console.error('Failed to extract audio text:', error);
    throw new Error(`Failed to extract audio text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function callDashscopeAsyncAPI(
  videoUrl: string,
  apiKey: string,
  model: string = 'sensevoice-v1'
): Promise<string> {
  try {
    // 1. Initiate async transcription task - Use correct SenseVoice API
    console.log('Initiating SenseVoice async transcription task...');
    const taskResponse = await httpClient.post(
      'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription',
      JSON.stringify({
        model: 'sensevoice-v1',
        input: {
          file_urls: [videoUrl]
        },
        parameters: {
          language_hints: ['zh', 'en']
        }
      }),
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable'
        }
      }
    );

    console.log('Task creation response:', taskResponse);

    if (!taskResponse.output || !taskResponse.output.task_id) {
      throw new Error(`Failed to create transcription task: ${JSON.stringify(taskResponse)}`);
    }

    const taskId = taskResponse.output.task_id;
    console.log(`Task ID: ${taskId}, waiting for transcription to complete...`);

    // 2. Wait for transcription to complete
    const result = await waitForTranscription(taskId, apiKey);
    return result;

  } catch (error) {
    console.error('Failed to call Alibaba Cloud async API:', error);
    throw new Error(`Failed to call Alibaba Cloud API: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function waitForTranscription(
  taskId: string,
  apiKey: string,
  maxRetries: number = 30,
  retryDelay: number = 2000
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Checking transcription status (${i + 1}/${maxRetries})...`);

      const statusResponse = await httpClient.get(
        `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );

      console.log('Status check response:', statusResponse);

      const responseData = typeof statusResponse.data === 'string'
        ? JSON.parse(statusResponse.data)
        : statusResponse.data;

      if (responseData.output && responseData.output.task_status === 'SUCCEEDED') {
        // Transcription completed, get results
        const results = responseData.output.results;
        console.log('Transcription successful, response structure:', JSON.stringify(responseData.output, null, 2));

        if (results && results.length > 0) {
          const result = results[0];

          // Check different possible response structures
          if (result.transcription_url) {
            const transcriptionUrl = result.transcription_url;
            console.log('Get transcription result URL:', transcriptionUrl);

            // Download transcription result
            const transcriptionResult = await httpClient.get(transcriptionUrl);
            const transcriptionData = typeof transcriptionResult.data === 'string'
              ? JSON.parse(transcriptionResult.data)
              : transcriptionResult.data;

            console.log('Transcription result:', transcriptionData);

            if (transcriptionData.transcripts && transcriptionData.transcripts.length > 0) {
              return transcriptionData.transcripts[0].text;
            } else {
              return "No text content recognized";
            }
          } else if (result.text) {
            // Return text result directly
            console.log('Get text result directly:', result.text);
            return result.text;
          } else if (result.transcription) {
            // Another possible structure
            console.log('Get result from transcription field:', result.transcription);
            return result.transcription;
          } else {
            console.log('Unknown result structure:', JSON.stringify(result, null, 2));
            return "Transcription successful but unable to parse result";
          }
        }
      } else if (responseData.output && responseData.output.task_status === 'FAILED') {
        throw new Error(`Transcription task failed: ${responseData.output.message || 'Unknown error'}`);
      } else if (responseData.output && responseData.output.task_status === 'PENDING') {
        // Task still processing, continue waiting
        console.log('Task processing, waiting...');
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      } else {
        throw new Error(`Abnormal transcription status: ${JSON.stringify(responseData)}`);
      }

    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      console.log(`Status check failed, retrying... (${error})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error('Transcription timeout, please try again later');
}