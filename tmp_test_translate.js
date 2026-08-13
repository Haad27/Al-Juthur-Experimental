const text = "شرح الكلمات: اشتروا بآيات الله: أي باعوا آيات الله وأخذوا بدلها الكفر. فصدوا عن سبيله: أي أعرضوا عن سبيل الله التي هي الإسلام كما صدوا غيرهم أيضاً. ساء: أي قبح. لا يرقبون: أي لا يراعون. إلا: الإل: الله، والقرابة والعهد وكلها صالحة هنا.";

async function test() {
  try {
      const res = await fetch('http://localhost:3000/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while(true) {
        const { done, value } = await reader.read();
        if (done) break;
        console.log("CHUNK:", decoder.decode(value));
      }
  } catch(e) {
      console.log(e);
  }
}
test();
