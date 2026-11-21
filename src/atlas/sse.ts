export interface ServerEvent {
  event: string;
  data: string;
}

/**
 * Reads a server-sent event stream as it arrives: `push` takes the next chunk of text and returns the
 * events it completed. Comments (`: ping`) and fields other than `event` and `data` are skipped.
 */
export class EventStreamReader {
  private buffer = '';

  push(chunk: string): ServerEvent[] {
    this.buffer += chunk.replace(/\r\n?/g, '\n');
    const events: ServerEvent[] = [];
    let end = this.buffer.indexOf('\n\n');
    while (end !== -1) {
      const block = this.buffer.slice(0, end);
      this.buffer = this.buffer.slice(end + 2);
      let event = 'message';
      const data: string[] = [];
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
      }
      if (data.length > 0) events.push({ event, data: data.join('\n') });
      end = this.buffer.indexOf('\n\n');
    }
    return events;
  }
}
