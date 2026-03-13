namespace backend_dotnet.Features.Note
{
    public class NoteDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
    public class AddNoteToQuizDto
    {
        public int? NoteId { get; set; }          // if attaching existing note
        public string? Title { get; set; }        // if creating new note
        public string? Content { get; set; }       // if creating new note
    }
}
