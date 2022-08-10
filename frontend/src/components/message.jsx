export default function Message({ message, user }) {
    return (
        <div id="message">
            <span style={message.senderId === user.sub ?
                { gridColumnStart: 2, justifySelf: 'end', backgroundColor: 'var(--primary)' } :
                { gridColumnStart: 1, justifySelf: 'start', backgroundColor: 'var(--secondary)' }}
            >
                {message.content}
            </span>
        </div>
    )
}